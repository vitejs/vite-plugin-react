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

## Current State

Periscopic is gone. `hoist.ts` now uses a custom `buildScopeTree` + `getBindVars`
pipeline that records concrete reference identifiers and resolves each one to its
declaring `Scope`.

This fixed the original shadowing bug. The current `ScopeTree` shape is:

```ts
type ScopeTree = {
  readonly referenceToDeclaredScope: Map<Identifier, Scope>
  readonly scopeToReferences: Map<Scope, Identifier[]>
  readonly nodeScope: Map<Node, Scope>
  readonly moduleScope: Scope
}
```

This is no longer the old periscopic-style name-only design. Resolution is per
identifier occurrence, not `findOwner(name: string)`.

What is still true:

- declarations are still stored as `Set<string>` on each `Scope`
- reference collection still walks every `Identifier` and classifies it with
  `isReferenceIdentifier(...)`
- the implementation still has known edge cases, notably default-parameter
  resolution against hoisted `var` declarations in the same function body

## Current Algorithm

`buildScopeTree` is a two-phase algorithm:

1. Walk the AST once to create scopes, collect declarations, and record raw
   `{ id, visitScope }` reference candidates.
2. After the walk, resolve each recorded identifier by scanning upward from
   `visitScope`, then propagate that identifier to `scopeToReferences` for the
   visit scope and all ancestors.

This is why the original shadowing bug is fixed now: resolution is per identifier
occurrence, and it happens only after all hoisted declarations are known.

The main implementation trade-off is elsewhere: phase 1 still records candidates by
walking every `Identifier` and asking `isReferenceIdentifier(...)` whether that syntax
position is a real read.

## Current Limits

The remaining problems are no longer the original periscopic ones.

### 1. Generic identifier classification is still brittle

The current implementation fixes the shadowing bug, but pass 1 still asks a low-level
question:

> given an arbitrary `Identifier`, is it a reference?

That forces `isReferenceIdentifier` to know about many ESTree edge cases:

- `Property`, `MethodDefinition`, `PropertyDefinition`
- import/export specifiers
- destructuring vs object literals
- parameter defaults
- `import.meta`
- labels

As soon as the helper needs parent/grandparent context, the abstraction is already
showing strain.

### 2. Some scope/visibility edge cases still need explicit fixups

The current code has at least one confirmed semantic gap:

- default parameter expressions incorrectly resolve to hoisted `var` declarations in the
  same function body (`param-default-var-hoisting.js`)

There are also lower-priority modeling gaps noted elsewhere:

- unconditional `for` / `for-in` / `for-of` scopes
- no `StaticBlock` scope

## Why Two Phases Still Make Sense

Two phases are still the right high-level structure because JavaScript hoisting requires
resolution against a complete scope picture.

Example:

```js
function action() {
  console.log({ foo })
  {
    var foo = 123
  }
}
```

If lookup happened eagerly, `foo` would be seen before the hoisted declaration was
registered and could be misresolved to an outer scope. Deferring resolution until after
declaration collection avoids that class of bug.

So the problem is not "two passes". The problem is specifically that the current first
pass still discovers reads by blind identifier classification.

## Practical Direction

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
        const scope = scopeTree.referenceToDeclaredScope.get(id)
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

This uses the current `ScopeTree` shape shown above. `nodeScope` is the entry point from
AST nodes into `Scope`; after that, `getBindVars` can stay as pure lookup over
`referenceToDeclaredScope` and `scopeToReferences`.

Keep the good part:

- declarations are collected before resolution
- references are resolved per identifier occurrence, not by name string

The practical maintenance goal is:

- keep the current two-phase `buildScopeTree` shape
- keep `isReferenceIdentifier` close to Vite SSR's `isRefIdentifier`
- document local divergences explicitly when ESTree-walker / fixture coverage requires them
- add fixtures for concrete edge cases instead of jumping to a larger architectural rewrite

This keeps the implementation easy to compare against a well-known upstream reference,
which is currently more valuable than pursuing a larger refactor.

## Alternative, Probably Overkill

An alternative design would avoid the global identifier classifier entirely.

Instead of asking:

> "given an arbitrary `Identifier`, is it a reference?"

it would ask:

> "for this AST node, which child nodes are read positions?"

That may be cleaner in the abstract, but it is a meaningfully larger refactor and is
not the recommended next step right now.

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

`getBindVars` would stay the same shape as the current design above: pure lookup over
`scopeToReferences` and `referenceToDeclaredScope`.

## Why This Might Be Simpler

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

## If We Ever Do It

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

## Decision

Do not over-index on "one pass vs two passes". The better boundary is:

- pass 1 answers "what names exist in which scopes?"
- pass 2 answers "which reads occur, and what do they resolve to?"

That split is coherent. The current implementation's weak point is not the existence of
two phases, but the number of syntax edge cases handled by `isReferenceIdentifier`.

For now, the preferred approach is pragmatic:

- stay aligned with Vite SSR's reference classifier where possible
- make local divergences explicit in comments and fixtures
- fix concrete semantic bugs without expanding the design surface unnecessarily

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
`isReferenceIdentifier` should stay aligned with its inverse. The concrete gaps found during the
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
