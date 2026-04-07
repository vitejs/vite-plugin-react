# scope.ts vs oxc-walker: comparison

**Our impl:** [src/transforms/scope.ts](../../../src/transforms/scope.ts)
**Prior art:** [github.com/oxc-project/oxc-walker](https://github.com/oxc-project/oxc-walker) — `src/scope-tracker.ts`

oxc-walker is a small TS utility that pairs an AST walker with an optional `ScopeTracker`. It is the most directly comparable prior art to our implementation in terms of scope (pun intended) — both are lightweight, ESTree-compatible, and purpose-built rather than general-purpose compiler infrastructure.

---

## Data model

### Ours

```ts
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

### oxc-walker

No `Scope` class. Scopes are keyed by string indices; the tracker is a flat map:

```ts
scopes: Map<scopeKey: string, Map<name: string, ScopeTrackerNode>>

// Scope key format: hierarchical dot-separated indices
// root: ""
// first child: "0"
// second child at depth 2: "0-1"
// Built from a depth-first traversal index stack

// Current scope tracked as:
scopeIndexStack: number[]    // e.g. [0, 1, 2]
scopeIndexKey:   string      // e.g. "0-1" (all but last = current scope key)
```

Declarations are **richer objects**, not just strings:

```ts
type ScopeTrackerNode =
  | ScopeTrackerVariable // VariableDeclaration binding — has variableNode
  | ScopeTrackerFunctionParam // function parameter — has fnNode
  | ScopeTrackerFunction // function declaration/expression id
  | ScopeTrackerIdentifier // class name or other identifier
  | ScopeTrackerImport // import specifier — has importNode
  | ScopeTrackerCatchParam // catch clause parameter — has catchNode

// All share a BaseNode with:
scope: string // scope key where declared
node: T // original AST node
start: number // source position
end: number
```

**Key difference:** oxc-walker uses string-keyed scope indices rather than object references with parent links. To walk up the scope chain you decompose the key string (split on `"-"`, drop the last segment). There is no scope parent pointer.

---

## Scope types created (entries in `scopes` map)

| Situation                         | oxc-walker                                       | Ours                                     |
| --------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| Program                           | `""` root scope                                  | `moduleScope`                            |
| `function f() {}`                 | scope for params (name declared in parent scope) | `Scope(isFunction=true)`                 |
| Named fn expr `(function f() {})` | **two scopes**: outer for name, inner for params | `Scope(isFunction=true)` with `f` inside |
| `() => {}`                        | scope for params                                 | `Scope(isFunction=true)`                 |
| `{ }` BlockStatement              | scope                                            | `Scope(isFunction=false)`                |
| `for` / `for…in` / `for…of`       | scope                                            | `Scope(isFunction=false)`                |
| `catch (e)`                       | scope                                            | `Scope(isFunction=false)`                |
| Named class expr `(class Foo {})` | scope for name (same pattern as NFE)             | `Scope(isFunction=false)` with `Foo`     |
| Class declaration                 | no scope; name declared in parent scope          | no scope                                 |
| `switch`                          | not handled                                      | `Scope(isFunction=false)`                |
| Class static block                | scope                                            | not handled                              |

**Named function expression: two scopes.** This is similar to eslint-scope's `FunctionExpressionNameScope` pattern but implemented as two separate entries in the flat scope map rather than two linked Scope objects:

```
""     → (outer scope)
"0"    → { f: ScopeTrackerFunction }   ← function name scope
"0-0"  → { param: ScopeTrackerFunctionParam, ... }  ← params scope
"0-0-0"→ (body BlockStatement scope)
```

Our implementation puts `f` into the function scope directly (no separate wrapper scope).

---

## Reference detection: `isBindingIdentifier`

oxc-walker exports `isBindingIdentifier(node, parent)` — a positive classifier that returns `true` when an `Identifier` is a **declaration** (binding position). Anything returning `false` is a reference. This is the inverse of our `isReferenceIdentifier`.

Positions classified as bindings (excluded from references):

| Parent                                   | Binding position                                |
| ---------------------------------------- | ----------------------------------------------- |
| FunctionDeclaration / FunctionExpression | `id`, each identifier in `params` patterns      |
| ArrowFunctionExpression                  | each identifier in `params` patterns (no `id`)  |
| ClassDeclaration / ClassExpression       | `id`                                            |
| VariableDeclarator                       | all identifiers in `id` pattern                 |
| CatchClause                              | all identifiers in `param` pattern              |
| MethodDefinition                         | `key`                                           |
| PropertyDefinition                       | `key`                                           |
| Property                                 | `key` when `key !== value` (i.e. not shorthand) |
| MemberExpression                         | `property` (always — computed or not)           |

This is close to but not identical to our `isReferenceIdentifier`. Key differences noted in `2026-04-04-hoist-variable-shadowing.md`:

- oxc-walker classifies `MethodDefinition` and `PropertyDefinition` keys as bindings (we do too).
- oxc-walker classifies `MemberExpression.property` as a binding regardless of `computed` — ours only excludes it when `!computed`. This means `obj[bar]` would be mis-classified by oxc-walker (computed properties are references, not bindings).

Wait — re-reading the source: `parent.property === node` with no `computed` check. This looks like a bug in oxc-walker for computed member expressions, or they assume oxc-parser normalizes this differently.

---

## Resolution strategy

**No pre-built reference→scope map.** References are not stored at all — the tracker only stores declarations. To check if an identifier is in scope, callers use:

```ts
scopeTracker.isDeclared(name) // walks up scope key hierarchy
scopeTracker.getDeclaration(name) // same, returns the ScopeTrackerNode
```

`isDeclared` reconstructs the ancestor chain by decomposing the key string:

```ts
const indices = this.scopeIndexKey.split('-').map(Number)
for (let i = indices.length; i >= 0; i--) {
  if (this.scopes.get(indices.slice(0, i).join('-'))?.has(name)) return true
}
```

For full undeclared-identifier analysis, callers must run **two passes** using `getUndeclaredIdentifiersInFunction`:

1. Walk with `ScopeTracker` to collect all declarations.
2. Call `scopeTracker.freeze()` to lock declarations.
3. Walk again; for each non-binding `Identifier` call `scopeTracker.isDeclared(name)`.

This matches our two-phase approach in principle, though we do both phases in a single walk + post-walk loop.

---

## `var` hoisting

**Not implemented.** `var` declarations are stored in the scope where they textually appear, not hoisted to the nearest function scope. This is documented as a known limitation — the scope model "doesn't mirror JavaScript's scoping 1:1". For the intended use case (finding undeclared identifiers via `getUndeclaredIdentifiersInFunction`) this is sufficient because the question is only "is this name declared anywhere inside this function?" not "which scope owns it."

---

## Public API

```ts
// Query (during or after walk)
scopeTracker.isDeclared(name: string): boolean
scopeTracker.getDeclaration(name: string): ScopeTrackerNode | null
scopeTracker.getCurrentScope(): string
scopeTracker.isCurrentScopeUnder(scope: string): boolean

// Lifecycle
scopeTracker.freeze(): void   // lock after first pass, reset for second pass

// Standalone utilities
isBindingIdentifier(node, parent): boolean
getUndeclaredIdentifiersInFunction(fn): string[]

// Integration with walker
walk(node, { scopeTracker, enter, leave })
```

`getUndeclaredIdentifiersInFunction` is the highest-level API and the closest equivalent to our `getBindVars` — it returns the names of all identifiers referenced but not declared inside a function. The difference: it returns names (`string[]`) not `Identifier` nodes, and doesn't distinguish outer-scope closures from globals (both are "undeclared inside the function").

---

## Scope deletion by default

Scopes are deleted from the map when exited unless `preserveExitedScopes: true`:

```ts
if (!this.options.preserveExitedScopes) {
  this.scopes.delete(this.scopeIndexKey)
}
```

This means single-pass use only reads the current scope chain. Two-pass analysis requires `preserveExitedScopes: true` so that the frozen declaration map survives into the second walk.

---

## What oxc-walker has that we don't

- **`ScopeTrackerNode` typed declarations** — knows if a name came from a `var`, param, import, catch, or function declaration.
- **`getUndeclaredIdentifiersInFunction`** high-level utility.
- **`freeze()` / two-pass pattern** — explicit API for multi-pass analysis.
- **Walker integration** — scope tracking is coupled directly into the walk API, so callers don't need to build the scope tree separately.

## What we have that oxc-walker doesn't

- **`var` hoisting** — correctly models `var` semantics.
- **`switch` scope.**
- **Per-`Identifier` reference map** (`referenceToDeclaredScope`) — answers "which exact scope declared this specific reference?" not just "is this name declared somewhere?".
- **`scopeToReferences` aggregation** — O(1) "all refs inside scope X".
- **Object parent links** — scope chain is a linked list of `Scope` objects, not a string key decomposition.
- **Distinguishes outer-scope closures from globals** — our `getBindVars` can filter to only bindings from scopes between the server function and the module root.
