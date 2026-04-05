# scope.ts vs Babel traverse Scope: comparison

**Our impl:** [src/transforms/scope.ts](../../../src/transforms/scope.ts)
**Prior art:** `~/code/others/babel/packages/babel-traverse/src/scope/`

Babel's `Scope` is the most feature-rich JS-side scope implementation in this survey. It is tightly coupled to `NodePath` (Babel's AST cursor with parent tracking), which enables capabilities like AST mutation, identifier renaming, and constant-violation tracking that a read-only scope analyzer cannot provide.

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

### Babel

```ts
Scope
  uid:       number                              // unique instance id
  path:      NodePath<Scopable>                  // path to scope-creating node
  block:     t.Scopable                          // AST node
  bindings:  { [name: string]: Binding }         // declarations in this scope
  references: { [name: string]: true }           // names referenced here
  globals:   { [name: string]: t.Identifier }    // undeclared identifiers
  uids:      { [name: string]: boolean }         // generated unique ids
  data:      { [key: string|symbol]: unknown }   // arbitrary plugin storage
  labels:    Map<string, NodePath<LabeledStatement>>

Binding
  identifier:          t.Identifier      // the declaration identifier node
  scope:               Scope             // owning scope
  path:                NodePath          // path to the binding site
  kind:                BindingKind       // "var" | "let" | "const" | "module" |
                                         // "hoisted" | "param" | "local" | "unknown"
  constant:            boolean           // false if ever reassigned
  constantViolations:  NodePath[]        // paths where binding is written after init
  referenced:          boolean           // has been used at least once
  references:          number            // reference count
  referencePaths:      NodePath[]        // path to each reference site
  hasValue:            boolean           // for constant propagation
  value:               any
```

**Key difference:** Babel is `Binding`-centric and `NodePath`-centric — every reference is stored as a `NodePath` (not just an `Identifier` node), giving full AST ancestry context. Our model stores `Identifier` nodes; Babel stores `NodePath` objects which additionally carry parent, grandparent, scope, and mutation APIs.

---

## BindingKind

Babel distinguishes 8 declaration kinds, which map to JS semantics:

| Kind        | When used                                                               |
| ----------- | ----------------------------------------------------------------------- |
| `"var"`     | `var` declarator                                                        |
| `"let"`     | `let` declarator, catch clause param, class declaration id              |
| `"const"`   | `const`/`using` declarator                                              |
| `"module"`  | import specifier                                                        |
| `"hoisted"` | function declaration id (hoisted to function scope)                     |
| `"param"`   | function parameter                                                      |
| `"local"`   | function expression id, class expression id (self-binding, scope-local) |
| `"unknown"` | export specifier                                                        |

---

## Scope types created

Babel defines a `Scopable` union of all scope-creating node types. Notably broader than ours:

| Node                                                               | Ours                    | Babel                                             |
| ------------------------------------------------------------------ | ----------------------- | ------------------------------------------------- |
| Program                                                            | moduleScope             | Scope                                             |
| FunctionDeclaration / FunctionExpression / ArrowFunctionExpression | Scope(isFunction=true)  | Scope                                             |
| ObjectMethod / ClassMethod / ClassPrivateMethod                    | not handled             | Scope                                             |
| BlockStatement                                                     | Scope(isFunction=false) | Scope                                             |
| CatchClause                                                        | Scope(isFunction=false) | Scope                                             |
| ForStatement / ForInStatement / ForOfStatement                     | Scope(isFunction=false) | Scope                                             |
| DoWhileStatement / WhileStatement                                  | not handled             | Scope                                             |
| SwitchStatement                                                    | Scope(isFunction=false) | Scope                                             |
| ClassDeclaration / ClassExpression                                 | named-expr only         | Scope                                             |
| StaticBlock                                                        | not handled             | Scope                                             |
| TSModuleBlock                                                      | not handled             | Scope                                             |
| Pattern (fn params)                                                | handled inside fn scope | Scope (when direct child of Function/CatchClause) |

Notably, Babel does NOT create a separate `FunctionExpressionNameScope` — the function expression name is a `"local"` binding inside the function's own scope, same as our implementation.

---

## Named function expressions and class expressions

Both put the self-reference name into the node's **own scope** as kind `"local"`:

```js
;(function f() {})(
  // f → kind:"local" in the function scope
  class Foo {},
) // Foo → kind:"local" in the class scope
```

This matches our implementation and differs from eslint-scope / typescript-eslint which use a separate `FunctionExpressionNameScope`.

---

## Class scopes

Class declarations get a `Scope`, but their name binding has an unusual aliasing behavior:

```ts
// ClassDeclaration id is registered as kind "let" in the PARENT scope
// Inside the class scope, the name is set as an alias to the parent binding:
path.scope.bindings[name] = path.scope.parent.getBinding(name)
```

So `Foo` in `class Foo {}` appears in both scopes but the class scope entry is just a pointer to the parent scope's `Binding` object — not a new `Binding`. Class expressions use `"local"` and do create an independent binding inside the class scope.

---

## Resolution: lazy crawl on demand

Babel uses **lazy initialization** — a scope is only crawled when first accessed:

```ts
init() → crawl()   // called from path.setScope() on first visit
```

The `crawl()` algorithm is two-phase:

**Phase 1 (declaration collection):** Traverse the scope's subtree with `collectorVisitor`. Declarations are registered immediately as `Binding` objects. `var` and function declarations are hoisted to the nearest function/program scope via `getFunctionParent()`.

**Phase 2 (reference resolution):** After the traversal, iterate `state.references` and call `scope.getBinding(name)` for each — this walks up the parent chain. Resolved references are added to `binding.referencePaths`; unresolved go to `programParent.globals`.

```ts
for (const ref of state.references) {
  const binding = ref.scope.getBinding(ref.node.name)
  if (binding) {
    binding.reference(ref) // adds NodePath to binding.referencePaths
  } else {
    programParent.addGlobal(ref.node)
  }
}
```

This is structurally the same two-phase approach as ours (collect declarations → resolve references). The key difference is timing: Babel crawls lazily when a scope is first touched during traversal, not at the end of a full tree walk.

---

## `var` hoisting

`var` declarations are explicitly hoisted to `getFunctionParent() || getProgramParent()` during collection:

```ts
// non-block-scoped declarations:
const parent = path.scope.getFunctionParent() || path.scope.getProgramParent()
parent.registerDeclaration(path)

// var in for-loop:
const parentScope = scope.getFunctionParent() || scope.getProgramParent()
parentScope.registerBinding('var', declar)
```

This is equivalent to our `getNearestFunctionScope()` call.

---

## `var` in loops marked non-constant

A `var` (or `hoisted`) binding declared inside a loop is automatically marked as non-constant:

```ts
if ((kind === 'var' || kind === 'hoisted') && isDeclaredInLoop(path)) {
  this.reassign(path) // constant = false, path added to constantViolations
}
```

Our implementation doesn't track constancy at all.

---

## Public API (scope queries)

```ts
// Binding lookup (walks parent chain)
scope.getBinding(name): Binding | undefined
scope.getOwnBinding(name): Binding | undefined
scope.hasBinding(name, opts?): boolean
scope.hasOwnBinding(name): boolean
scope.parentHasBinding(name, opts?): boolean

// Scope hierarchy
scope.getProgramParent(): Scope
scope.getFunctionParent(): Scope | null
scope.getBlockParent(): Scope

// Binding mutation
scope.registerBinding(kind, path): void
scope.removeBinding(name): void
scope.moveBindingTo(name, scope): void
scope.rename(oldName, newName?): void    // AST-aware rename across all references
scope.push({ id, init?, kind? }): void  // inject new variable into scope

// UID generation
scope.generateUid(name?): string
scope.generateUidIdentifier(name?): t.Identifier

// Plugin data
scope.setData(key, val): void
scope.getData(key): any
```

The `rename()` API is particularly powerful — it traverses the scope subtree and rewrites all reference sites, skipping nested scopes that shadow the binding.

---

## What Babel has that we don't

- **`Binding` with `referencePaths`** — every reference is a `NodePath` with full mutation capabilities.
- **`constantViolations`** — tracks exactly where a binding is written after initialization.
- **`constant` flag** — derived fact useful for optimization (constant folding, inlining).
- **`binding.kind`** — 8 declaration kinds including `"hoisted"`, `"local"`, `"module"`.
- **`scope.rename()`** — AST-aware identifier renaming across all reference sites.
- **`scope.generateUid()`** — unique identifier generation that avoids collisions.
- **`scope.push()`** — inject new variable declarations into a scope.
- **Lazy crawl** — scopes only analyzed when needed, not upfront.
- **Plugin data store** (`scope.setData/getData`) — shared state across visitors.
- **`DoWhileStatement`/`WhileStatement` scopes.**

## What we have that Babel doesn't

- **`scopeToReferences` aggregation** — O(1) "all refs inside scope X" without a walk.
- **ESTree input** — Babel operates on its own AST format, not ESTree. Our implementation works directly with Vite's `parseAstAsync` output.
- **Simplicity** — ~300 lines, no NodePath coupling, no mutation API, no lazy crawl machinery.
