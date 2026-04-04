# Hoist: Variable Shadowing Bug in `bindVars` Collection

## Problem

`transformHoistInlineDirective` in `src/transforms/hoist.ts` incorrectly binds variables
that are fully shadowed inside the server function by inner block-scoped declarations.

### Failing cases (all fixed, were labeled `TODO` in `hoist.test.ts`)

**`shadowing local body over local`** — declaration directly in action's body

```js
function outer() {
  const value = 0
  async function action() {
    'use server'
    const value = 0 // declared in action's own body
    return value
  }
}
```

**`shadowing local body and if over local`** — declaration in body + if-block

```js
function outer() {
  const value = 0
  async function action() {
    'use server'
    if (true) {
      const value = 0
      return value
    }
    const value = 0
    return value
  }
}
```

**`shadowing local over local`** — declaration only inside an if-block

```js
function outer() {
  const value = 0
  async function action() {
    'use server'
    if (true) {
      const value = 0
      return value
    }
  }
}
```

**`shadowing local over local over global`**

```js
const value = 0
function outer() {
  const value = 0
  async function action() {
    'use server'
    if (true) {
      const value = 1
      return value
    }
  }
}
```

## Root Cause (periscopic)

The original periscopic-based code:

```ts
const scope = analyzed.map.get(node) // returns param scope, not body scope
const bindVars = [...scope.references].filter((ref) => {
  const owner = scope.find_owner(ref) // name-string lookup walking upward
  return owner && owner !== scope && owner !== analyzed.scope
})
```

Two layered problems:

1. **Wrong scope anchor:** `analyzed.map.get(functionNode)` returns the param scope.
   Body-level `const`/`let` declarations live in a separate child `BlockStatement` scope
   in periscopic's model. So `find_owner` is called from the wrong starting point.

2. **Name-based resolution:** `scope.references` is `Set<string>` and `find_owner` takes
   a string. There is no connection between a specific reference occurrence and the scope
   that owns it — you can only ask "does ANY declaration of this name live outside?" not
   "does THIS specific reference resolve outside?". Shadowing is invisible.

## Interim Fix (current state)

Replaced periscopic's `analyze()` with a custom `buildScopeTree` + `getBindVars` that
correctly unifies function params and body into one scope. This fixes the param-scope
anchor problem and makes all TODO tests pass.

However, this is still the same **name-based design**: `Scope` holds
`declarations: Set<string>`, and `findOwner(name: string)` walks up the chain by name.
The structural flaw remains — it works for the current test cases because
`buildScopeTree` now anchors correctly, but the abstraction is still wrong in principle.

## Target Design

Frame the problem as:

> Given `references: Identifier[]` (all reference-position identifiers inside a `use
server` function body), and a way to look up the declaring `Scope` for each one, bind
> exactly those whose declaring scope is neither the module root nor inside the function
> body itself.

With this framing `getBindVars` is pure data lookup — no walk, no stack, no string
matching:

```ts
const fnScope = scopeTree.nodeScope.get(fn)!
const references = scopeTree.scopeToReferences.get(fnScope) ?? []
const bindVars = [
  ...new Set(
    references
      .filter((id) => id.name !== declName)
      .filter((id) => {
        const scope = scopeTree.identifierScope.get(id)
        return (
          scope !== undefined &&
          scope !== scopeTree.moduleScope &&
          isStrictAncestor(scope, fnScope)
        ) // scope is in outer fn, not inside
      })
      .map((id) => id.name),
  ),
]
```

### Target types

```ts
type Scope = {
  readonly parent: Scope | null
  // no declarations, no methods — purely an identity token with a parent link
}

type ScopeTree = {
  // each reference Identifier → the Scope that declared it (undefined = module-level)
  readonly identifierScope: WeakMap<Identifier, Scope>
  // each Scope → the direct reference Identifiers whose enclosing function scope is this
  // (inverse of identifierScope, keyed by scope rather than by function node)
  readonly scopeToReferences: WeakMap<Scope, Identifier[]>
  // scope-creating AST node → its Scope (bridge from AST into Scope world)
  readonly nodeScope: WeakMap<Node, Scope>
  readonly moduleScope: Scope
}
```

`nodeScope` is the only entry point from AST nodes into `Scope`. After that, everything
is expressed purely in terms of `Scope` and `Identifier` — no AST node types, no strings.

All the work is in `buildScopeTree` (two passes — see below). `getBindVars` has no logic of its own.

## Design Smell in the Current Prototype

The current custom implementation fixed the shadowing bug, but its internal shape still
has an avoidable smell:

1. Pass 1 builds declarations and scopes.
2. Pass 2 walks the whole AST again.
3. Pass 2 decides whether each `Identifier` is a "real reference" with a generic syntax
   classifier.

That last step is the weak point. It re-derives AST-position meaning after the fact,
which forces helper logic like `isBindingIdentifier` to know about many ESTree edge
cases (`Property`, `MethodDefinition`, import/export specifiers, destructuring, etc.).
As soon as the helper needs parent/grandparent context, the abstraction is already
telling us it is too low-level.

Two passes are **inherently required** by JavaScript's hoisting semantics. A `var`
declaration or function declaration may appear textually _after_ a reference to the same
name in the same function:

```js
function action() {
  console.log({ foo }) // reference — var foo not seen yet
  {
    var foo = 123 // hoisted to action's function scope
  }
}
```

A single-pass resolver would see `foo` before `var foo` is recorded, scan upward, and
incorrectly attribute it to an outer binding. Pass 1 must collect all declarations first
so that pass 2 can resolve every reference against the complete, frozen scope picture.

The problem is not "two passes" by itself — that is correct and necessary. The smell is
"walk every `Identifier` in pass 2 and classify it generically".

## Proposed New Shape

Keep the good part:

- pass 1 builds the scope tree and records declarations

Replace the brittle part:

- pass 2 should not walk every `Identifier`
- pass 2 should walk only expression/reference-bearing child positions
- pass 2 should resolve references immediately when visiting those positions

In other words, instead of asking:

> "given an arbitrary `Identifier`, is it a reference?"

ask:

> "for this AST node, which child nodes are read positions?"

That moves the complexity from a global classifier to local per-node traversal rules,
which is easier to reason about and matches how closure capture actually works.

### Sketch

```ts
function buildScopeTree(ast: Program): ScopeTree {
  // pass 1: create scopes, declare names, hoist `var`
}

function collectReferences(ast: Program, scopeTree: ScopeTree): void {
  // pass 2: walk only read/reference positions
  // for each Identifier read:
  //   1. resolve owner scope
  //   2. store identifier -> owner scope
  //   3. append identifier to enclosing function scope's references
}
```

`getBindVars` stays the same shape as the target design above: pure lookup over
`scopeToReferences` and `identifierScope`.

## Why This Is Simpler

### No global identifier classifier

We can delete the "is this arbitrary `Identifier` a binding?" helper entirely, or reduce
it to a tiny internal helper if one case still wants it.

### No grandparent hacks

`Property` ambiguity goes away when traversal is explicit:

- `ObjectExpression`
  - visit `value`
  - visit `key` only if `computed`
- `ObjectPattern`
  - do not treat the pattern as a read; it belongs to declaration handling

So object literals and object patterns are separated structurally, not inferred from an
identifier's ancestors.

### Better fit for the actual question

The hoist transform does not need a general-purpose "all identifiers in ESTree" oracle.
It needs:

- declarations, scoped correctly
- reads inside the server function body
- owner scope for each read

That is a narrower and more maintainable target.

## Concrete Pass-2 Rules

Pass 2 should be a reference visitor over expression positions, not a blind AST scan.
Representative rules:

- `Identifier`
  - record as a read only when reached through a read-position visitor
- `MemberExpression`
  - always visit `object`
  - visit `property` only if `computed`
- `Property` under `ObjectExpression`
  - visit `value`
  - visit `key` only if `computed`
- `CallExpression` / `NewExpression`
  - visit `callee`
  - visit all args
- `ReturnStatement`
  - visit `argument`
- `BinaryExpression`, `LogicalExpression`, `UnaryExpression`, `UpdateExpression`
  - visit operand expressions
- `ConditionalExpression`
  - visit `test`, `consequent`, `alternate`
- `AssignmentExpression`
  - visit `right`
  - visit `left` only when it contains computed member accesses that read values
- `TemplateLiteral`
  - visit all expressions
- `TaggedTemplateExpression`
  - visit `tag` and all template expressions
- `AwaitExpression` / `YieldExpression`
  - visit `argument`
- `ClassBody`
  - for `PropertyDefinition`, visit `value` and `key` only if `computed`
  - for `MethodDefinition`, visit `key` only if `computed`; method body is handled by its
    own function scope

This is not a full ESTree spec list yet. It is the shape we want: explicit read
positions, explicit declaration positions.

## Migration Plan

1. Keep the current `Scope` / `ScopeTree` data model.
2. Leave pass 1 mostly as-is, since it already fixes the original shadowing bug.
3. Replace the generic pass-2 `Identifier` walk with a dedicated reference visitor.
4. Delete `isBindingIdentifier` once pass 2 no longer depends on it.
5. Add focused tests for syntax that previously depended on classifier edge cases:
   - class methods and fields
   - object literal vs object pattern
   - import/export specifiers
   - destructured params
   - computed keys

## Decision

Do not over-index on "one pass vs two passes". The better boundary is:

- pass 1 answers "what names exist in which scopes?"
- pass 2 answers "which reads occur, and what do they resolve to?"

That split is coherent. The current prototype's problem is that pass 2 still asks a more
primitive question than it really needs to.

## Reference Repos

### oxc-walker (`~/code/others/oxc-walker`)

**Key design — two-pass with frozen scope:**

1. First pass: build scope tree, record all declarations (hoisting, `var` vs `let`/`const`)
2. `freeze()` — locks scope data
3. Second pass: for each `Identifier` in reference position, walk up scope hierarchy

`getUndeclaredIdentifiersInFunction` is close but not directly usable — it doesn't
distinguish module-level globals from outer-function-scope closures. We need only the
subset whose owner is strictly between the action and the module root.

**Compatibility:** targets oxc-parser which outputs ESTree — same as Vite 8's
`parseAstAsync`. `walk()` accepts a pre-parsed AST directly.

**Relevant helper:** `src/scope-tracker.ts:isBindingIdentifier`. Our local
`isReferenceId` should stay aligned with its inverse. The concrete gaps found during the
comparison were:

- `MethodDefinition` and `PropertyDefinition`: non-computed keys are bindings, not
  references
- `ExportSpecifier`: `local` is a reference, `exported` is not

The remaining differences (`RestElement`, `ArrayPattern`, import specifiers, explicit
param handling) are currently harmless for `getBindVars`.

### Vite `ssrTransform.ts` (`~/code/others/vite/packages/vite/src/node/ssr/ssrTransform.ts`)

Working ESTree + `estree-walker` scope implementation (lines ~456–760). Uses a live scope
stack during the walk (`scopeMap`, `varKindStack`, `isInScope`) — closer to the target
design. `estree-walker` is already a dep of `plugin-rsc`.

### periscopic (`~/code/others/periscopic`)

Dropped as a dep. `extract_identifiers` / `extract_names` copied directly into the
codebase — small, correct, well-tested utilities for extracting binding names from
destructuring patterns. Source: `src/index.js`.
