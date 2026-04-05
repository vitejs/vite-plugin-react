# scope.ts vs Vite SSR transform: comparison

**Our impl:** [src/transforms/scope.ts](../../../src/transforms/scope.ts)
**Prior art:** [github.com/vitejs/vite](https://github.com/vitejs/vite) — `packages/vite/src/node/ssr/ssrTransform.ts` (~L456–776)

---

## Purpose

The scope analysis in `ssrTransform.ts` is not a general-purpose scope library — it answers one specific question: which identifiers are free variables that reference an imported binding, so that the transform can rewrite them (e.g. `foo` → `__import_x__.foo`). This is a narrower goal than ours (`getBindVars` finds outer-scope closures for `use server` functions), but the underlying machinery is similar.

---

## Data model

### Ours

```
Scope (class)
  declarations: Set<string>
  parent: Scope | undefined
  isFunction: boolean

ScopeTree
  referenceToDeclaredScope: Map<Identifier, Scope>
  scopeToReferences:        Map<Scope, Identifier[]>
  nodeScope:                Map<Node, Scope>
  moduleScope:              Scope
```

### Vite SSR

No `Scope` class — entirely ad-hoc with module-level data structures:

```ts
const parentStack: ESTree.Node[] // DFS ancestor stack
const varKindStack: ESTree.VariableDeclaration['kind'][] // current var kind context
const scopeMap: WeakMap<ESTree.Node, Set<string>> // scope node → declared names
const identifiers: [id: ESTree.Identifier, stack: ESTree.Node[]][] // deferred reference list
```

`scopeMap` maps each scope-creating AST node directly to a `Set<string>` of declared names — no `Scope` objects, no parent links. Scope hierarchy is reconstructed on demand by walking `parentStack`.

---

## Scope types created (entries in `scopeMap`)

| Situation                                        | Vite SSR                                        | Ours                                 |
| ------------------------------------------------ | ----------------------------------------------- | ------------------------------------ |
| Program (module root)                            | `scopeMap.set(Program, ...)`                    | `moduleScope`                        |
| `function f() {}` / `function() {}` / `() => {}` | `scopeMap.set(fn, ...)`                         | `Scope(isFunction=true)`             |
| Named fn expr `(function f() {})`                | name added to the **function's own** scope node | same                                 |
| `function f() {}` name                           | added to **parent** scope node                  | same                                 |
| `class Foo {}` name                              | added to **parent** scope node                  | same                                 |
| Named class expr `(class Foo {})`                | name added to **class's own** scope node        | `Scope(isFunction=false)` with `Foo` |
| `{ }` BlockStatement                             | `scopeMap.set(block, ...)`                      | `Scope(isFunction=false)`            |
| `for` / `for…in` / `for…of`                      | `scopeMap.set(for, ...)`                        | `Scope(isFunction=false)`            |
| `catch (e)`                                      | `scopeMap.set(catch, ...)`                      | `Scope(isFunction=false)`            |
| `class {}` static block                          | `scopeMap.set(staticBlock, ...)`                | not handled                          |
| `switch`                                         | not handled (no entry in `blockNodeTypeRE`)     | `Scope(isFunction=false)`            |

Named class expression handling is the same as ours: the self-binding name is visible only inside the class. switch scopes diverge: Vite SSR skips them, we create one.

---

## Resolution strategy

### Vite SSR: two-phase, but eagerly filtered during walk

**Phase 1 (DFS enter/leave):** Builds `scopeMap` with all declarations. References are identified by `isRefIdentifier()` and filtered by `isInScope()` during this pass — but only stored into `identifiers[]`, not resolved yet.

**Phase 2 (sequential):** Processes `identifiers[]` in order. Re-checks `isInScope()` with the stored parent stack snapshot.

```ts
identifiers.forEach(([node, stack]) => {
  if (!isInScope(node.name, stack)) onIdentifier(node, stack[0], stack)
})
```

`isInScope` walks the stored `parentStack` looking for a `scopeMap` entry that contains the name:

```ts
function isInScope(name: string, parents: ESTree.Node[]) {
  return parents.some((node) => scopeMap.get(node)?.has(name))
}
```

Because phase 1 finishes before phase 2 begins, all declarations (including hoisted `var` and function declarations) are already in `scopeMap` when references are resolved. This is the same two-phase approach as ours, though expressed differently (we store `visitScope` reference; they store a `parentStack` snapshot).

### Ours: post-walk, Identifier → declaring Scope

We store `{ id: Identifier, visitScope: Scope }` and resolve by walking up the `Scope` parent chain. The outcome is the same but we produce a `Map<Identifier, Scope>` linking each ref to its declaring scope, whereas Vite SSR only produces a boolean "is this in scope or not".

---

## `var` hoisting

Vite SSR uses `varKindStack` to track whether the current declaration is `var`, then passes `isVar` to `findParentScope`:

```ts
function findParentScope(parentStack, isVar = false) {
  return parentStack.find(isVar ? isFunction : isBlock)
}
```

- `var` → finds nearest function scope (by `isFunction` regex match)
- `let`/`const` → finds nearest block scope (by `isBlock` regex match)

Our implementation uses `getNearestFunctionScope()` for `var`, or stays at `current` for `let`/`const` — same logic, different expression.

---

## Reference detection: `isRefIdentifier`

Both implementations have an `isRefIdentifier` / `isReferenceIdentifier` function that filters out syntax-only identifier positions. Vite SSR's version is the direct inspiration for ours. Key differences:

- Vite SSR pre-marks pattern nodes in a `WeakSet` during declaration handling, making pattern vs. expression distinction available at reference-check time without needing grandparent context.
- Our implementation uses the `parentStack` directly (grandparent lookups) instead of a pre-mark WeakSet.
- Vite SSR skips `ImportDeclaration` subtrees entirely with `this.skip()` so import specifier identifiers never reach the reference check. We handle them explicitly in `isReferenceIdentifier`.

---

## What Vite SSR has that we don't

- `StaticBlock` scope (class static initializers).
- Regex-based `isFunction` match catches generator and async variants (`GeneratorFunctionExpression`, `AsyncFunctionDeclaration`, etc.) generically without enumerating them.
- Pre-marked WeakSet for patterns — cleaner than grandparent-stack checks.

## What we have that Vite SSR doesn't

- `Scope` objects with parent links — enables walking the scope hierarchy without needing a `parentStack` snapshot.
- Per-`Identifier` → declaring `Scope` map — answers "where exactly does this ref resolve?" not just "is it in scope?".
- `scopeToReferences` aggregation — O(1) "all refs inside scope X".
- Named class expression scope (self-binding correctly isolated).
- `switch` scope.
