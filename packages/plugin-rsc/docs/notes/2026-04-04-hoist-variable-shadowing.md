# Hoist: Variable Shadowing Bug in `bindVars` Collection

## Problem

`transformHoistInlineDirective` in `src/transforms/hoist.ts` incorrectly binds variables
that are fully shadowed inside the server function by inner block-scoped declarations.

### Failing cases (labeled `TODO` in `hoist.test.ts`)

**`shadowing local body over local`** — simplest case, declaration directly in action's body

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

Current output: `.bind(null, value)` — unnecessary, outer `value` is never used.

**`shadowing local body and if over local`** — declaration in body + if-block, all paths covered

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

Current output: `.bind(null, value)` — unnecessary, outer `value` is never used.

**`shadowing local over local`** — declaration only inside an if-block

```js
function outer() {
  const value = 0 // outer local
  async function action() {
    'use server'
    if (true) {
      const value = 0 // shadows in if-block only
      return value
    }
  }
}
```

Current output: `.bind(null, value)` — unnecessary, outer `value` is never used.

**`shadowing local over local over global`**

```js
const value = 0 // global
function outer() {
  const value = 0 // outer local
  async function action() {
    'use server'
    if (true) {
      const value = 1
      return value
    }
  }
}
```

Current output: `.bind(null, value)` — captures outer local unnecessarily.

## Root Cause

The `bindVars` filter in `hoist.ts` (~line 85):

```ts
const bindVars = [...scope.references].filter((ref) => {
  if (ref === declName) return false
  const owner = scope.find_owner(ref)
  return owner && owner !== scope && owner !== analyzed.scope
})
```

The core problem: **`analyzed.map.get(functionNode)` returns the scope for the function's
parameter list, not its body block.** In periscopic, `const`/`let` declarations in the
function body live in a child `BlockStatement` scope, separate from the param scope.

So `scope` here is the _param scope_ of `action`, and:

1. **`scope.references`** includes `"value"` (it is referenced in the body, not declared
   among the params).

2. **`scope.find_owner("value")`** walks upward from the param scope and finds `outer` —
   it never looks downward into the body's block scope where `const value = 0` is declared.

Result: even a `const value` declared directly in `action`'s own body causes unnecessary
binding, because the code is anchored to the wrong scope (params, not body).

This makes the if-block cases a consequence of the same root issue — if the body-level
block scope is already invisible to `find_owner`, nested block scopes inside the body are
doubly so.

## Correct Cases (labeled `ok` in `hoist.test.ts`)

| Test                                             | Behavior | Why correct                                                   |
| ------------------------------------------------ | -------- | ------------------------------------------------------------- |
| `shadowing partial local over local`             | binds    | `return value` after if-block uses outer local                |
| `shadowing local over global`                    | no bind  | no outer local; global filtered by `owner !== analyzed.scope` |
| `shadowing partial local over global`            | no bind  | `return value` uses global, no outer local                    |
| `shadowing local over local over global`         | no bind  | no outer local in `outer`; only global                        |
| `shadowing partial local over local over global` | binds    | `return value` after if-block uses outer local                |

## Reference Repos

### oxc-walker (`~/code/others/oxc-walker`)

The most directly relevant reference. Provides `getUndeclaredIdentifiersInFunction()`
which is conceptually exactly what `bindVars` collection needs.

**Key design — two-pass with frozen scope:**

1. First pass over the function node: build a scope tree, record all declarations
   (respecting `var` hoisting vs `let`/`const` block scoping)
2. `freeze()` — locks scope data so hoisting decisions are final
3. Second pass: for each `Identifier` in a reference position, walk up the scope
   hierarchy to find its owner; if undeclared within the function → free variable

**API surface relevant to us:**

- `walk(input: Program | Node, options)` — accepts a pre-parsed AST directly
- `ScopeTracker` — hierarchical scope tracking, exported standalone
- `getUndeclaredIdentifiersInFunction(node)` — finds names not declared within the
  function, but does NOT distinguish module-level from outer-function-scope declarations.
  Not directly usable: we need only the subset whose owner is between the action and
  the module root (i.e. closure variables), not module-level globals.

**Compatibility:** oxc-walker targets oxc-parser, which outputs ESTree-compatible AST —
the same format as Vite 8's `parseAstAsync` (which uses oxc-parser internally). So
`walk()` and `ScopeTracker` work directly on our existing AST without re-parsing.

**Dependency note:** `ScopeTracker` itself has no runtime dependency on oxc-parser
(only `import type`). However, `walk.ts` has a static `import { parseSync } from
"oxc-parser"` at the top, so oxc-parser must be present in node_modules even if
`parseAndWalk` is never called. Since Vite 8 ships oxc-parser, it is available
transitively — but not a guaranteed public API surface.

### Vite `ssrTransform.ts` (`~/code/others/vite/packages/vite/src/node/ssr/ssrTransform.ts`)

Shows a working ESTree + `estree-walker` scope implementation (lines ~456–760).

**Key patterns:**

- `scopeMap: WeakMap<Node, Set<string>>` — maps each scope node to its declared names
- `varKindStack` — tracks `var` vs `let`/`const` to determine whether to hoist to
  function scope or stay in block scope
- `isInScope(name, parents)` — walks the parent stack upward to check shadowing
- `handlePattern()` — recursively extracts names from destructuring patterns

Designed for SSR module rewriting (not free-variable extraction), but the scope-stack
mechanics are directly adaptable. Uses `estree-walker`, which is already a dependency
of `plugin-rsc`.

### periscopic (`~/code/others/periscopic`)

Current dependency. The bug is confirmed in its source:

For `FunctionDeclaration`, periscopic calls `push(node, false)` to enter the function
scope, then records params in that scope. The function body's `BlockStatement` becomes
a separate **child** block scope. So `map.get(functionNode)` returns the **param scope**,
not the body scope.

Consequence: `const`/`let` declared directly in the function body are in a child scope
invisible to `find_owner` when called from the param scope anchor. `find_owner` walks
upward and finds the outer function's declaration instead.

**Plan:** drop periscopic as a dep entirely, but directly copy `extract_identifiers` and
`extract_names` into the codebase. They are small, correct, well-tested ESTree utilities
for extracting binding names from destructuring patterns — no need to rewrite them from
scratch when the source is a known-good reference.

## Planned Fix

Replace the periscopic-based analysis with a custom scope walk that resolves references
at the **identifier occurrence level** rather than at the **name level**.

Two options:

**Option A — use `oxc-walker` directly**
Call `getUndeclaredIdentifiersInFunction` or use `ScopeTracker` + `walk` with the
pre-parsed AST. Least code, but adds a new dep and relies on oxc-parser being available
via Vite.

**Option B — custom scope tracker with `estree-walker` (preferred)**
Implement a two-pass frozen-scope approach inspired by oxc-walker, using `estree-walker`
(already a dep). Tailored narrowly to the one task: find free variables of a server
function relative to the module root. No new deps.

For each `Identifier` in a reference position, determine which scope it resolves to by
walking up the scope stack. A variable is added to `bindVars` only if at least one
reference occurrence resolves to a scope that is an ancestor of the action function but
not the module root.

This also opens the door to a **single-pass implementation** (maintain a scope stack
during descent, classify each reference in-place).

### Note on pre-processing

The current code mutates the AST before calling `analyze()` to strip re-exports
(`ExportAllDeclaration`, `ExportNamedDeclaration` without declaration) because they
confuse periscopic. A custom walker can skip those node types inline instead.
