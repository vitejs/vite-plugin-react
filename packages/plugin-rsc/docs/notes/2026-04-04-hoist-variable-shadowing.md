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

## Planned Fix

Replace the periscopic-based analysis with a custom scope walk that resolves references
at the **identifier occurrence level** rather than at the **name level**.

For each `Identifier` node encountered during the walk, determine which scope it resolves
to by checking both upward (outer function scopes) and downward (inner block scopes already
visited). A variable should be added to `bindVars` only if at least one of its reference
occurrences resolves to a scope that is an ancestor of `action` but not the module root.

This approach also opens the door to a **single-pass implementation** (maintain a scope
stack during descent, classify each reference in-place) rather than the current two-pass
approach (periscopic analysis + estree-walker transform).

### Note on pre-processing

The current code mutates the AST before calling `analyze()` to strip re-exports
(`ExportAllDeclaration`, `ExportNamedDeclaration` without declaration) because they confuse
periscopic. A custom walker will need to handle or replicate this, or skip those node types
inline.
