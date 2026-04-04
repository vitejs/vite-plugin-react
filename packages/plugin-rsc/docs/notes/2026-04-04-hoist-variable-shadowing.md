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

The correct fix is **reference-position resolution**: for each `Identifier` node
encountered in a reference position during the AST walk, determine which scope owns it
**at the point it appears** using the live scope stack at that moment.

This is fundamentally different from name-based lookup:

- When you enter a block that declares `value`, you push that scope onto the stack
- When you encounter a reference to `value`, you check the stack top-down
- Shadowing is handled naturally by stack order — inner declarations are found first
- No post-hoc name string matching detached from traversal position

Concretely: the scope stack itself during the walk IS the resolution context. Each
identifier reference is resolved inline, not by querying a pre-built map with a string.
`declarations: Set<string>` + `findOwner(string)` should be replaced with a stack where
each frame knows which identifiers it introduces, resolved per occurrence.

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

### Vite `ssrTransform.ts` (`~/code/others/vite/packages/vite/src/node/ssr/ssrTransform.ts`)

Working ESTree + `estree-walker` scope implementation (lines ~456–760). Uses a live scope
stack during the walk (`scopeMap`, `varKindStack`, `isInScope`) — closer to the target
design. `estree-walker` is already a dep of `plugin-rsc`.

### periscopic (`~/code/others/periscopic`)

Dropped as a dep. `extract_identifiers` / `extract_names` copied directly into the
codebase — small, correct, well-tested utilities for extracting binding names from
destructuring patterns.
