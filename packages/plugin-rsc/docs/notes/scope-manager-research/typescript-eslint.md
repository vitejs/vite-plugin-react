# scope.ts vs typescript-eslint scope-manager: comparison

**Our impl:** [src/transforms/scope.ts](../../../src/transforms/scope.ts)
**Prior art:** [github.com/typescript-eslint/typescript-eslint](https://github.com/typescript-eslint/typescript-eslint) — `packages/scope-manager/`

---

## Data model

### Ours

```
Scope
  declarations: Set<string>          // names declared here
  parent: Scope | undefined
  isFunction: boolean                // whether this is a function boundary

ScopeTree
  referenceToDeclaredScope: Map<Identifier, Scope>  // ref id → declaring scope (null = global)
  scopeToReferences:        Map<Scope, Identifier[]> // scope → all ref ids (propagated upward)
  nodeScope:                Map<Node, Scope>          // AST node → its scope
  moduleScope:              Scope
```

### typescript-eslint

```
ScopeBase<Type, Block, Upper>
  type:        ScopeType enum        // 18 distinct types
  variables:   Variable[]            // Variables declared here
  set:         Map<string, Variable> // name → Variable
  references:  Reference[]           // References created in THIS scope
  through:     Reference[]           // Unresolved refs delegated to upper scope
  childScopes: Scope[]
  upper:       Scope | null
  block:       TSESTree.Node         // the AST node that created this scope
  variableScope: VariableScope       // nearest function/module/global scope (for var hoisting)

Variable
  name:       string
  defs:       Definition[]    // where it was declared (includes kind: var/let/const/param/...)
  references: Reference[]     // all uses of this variable
  identifiers: Identifier[]   // declaration sites
  scope:      Scope           // declaring scope

Reference
  identifier: Identifier
  from:       Scope           // scope where the reference appears
  resolved:   Variable | null // null = global/undeclared
  flag:       ReferenceFlag   // Read | Write | ReadWrite
  writeExpr:  Node | null     // the rhs in an assignment
  init:       boolean         // initializer write
```

**Key difference:** typescript-eslint is _Variable-centric_: each name gets a `Variable` object linking all its definition sites and use sites. Ours is _Identifier-centric_: each reference `Identifier` node maps to a `Scope`; we never build a `Variable` object grouping all uses of the same name.

---

## Scope types created

| Situation                                                  | Ours                                                  | typescript-eslint                                              |
| ---------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| Program / module                                           | `Scope(undefined, isFunction=true)` (moduleScope)     | `GlobalScope` + `ModuleScope`                                  |
| `function f() {}` / `function() {}` / `() => {}`           | `Scope(parent, isFunction=true)`                      | `FunctionScope`                                                |
| Named function expression `(function f() {})`              | function name added to the function's own scope       | **`FunctionExpressionNameScope`** wrapping the `FunctionScope` |
| `class Foo {}` (declaration)                               | no extra scope                                        | `ClassScope` with `Foo` defined inside                         |
| `(class Foo {})` (named expression)                        | `Scope(parent, isFunction=false)` with `Foo` declared | `ClassScope` with `Foo` defined inside                         |
| `(class {})` (anonymous expression)                        | no scope                                              | `ClassScope` (still created)                                   |
| `{ }` BlockStatement                                       | `Scope(parent, isFunction=false)`                     | `BlockScope`                                                   |
| `for (…) {}` / `for…in` / `for…of`                         | `Scope(parent, isFunction=false)`                     | `ForScope`                                                     |
| `switch (…) {}`                                            | `Scope(parent, isFunction=false)`                     | `SwitchScope`                                                  |
| `catch (e) {}`                                             | `Scope(parent, isFunction=false)`                     | `CatchScope`                                                   |
| TypeScript-specific (enum, namespace, conditional type, …) | not supported                                         | many extra scope types                                         |

### Notable divergence 1 — FunctionExpressionNameScope

typescript-eslint inserts a **separate wrapper scope** for the name of a named function expression:

```
outer scope
  └─ FunctionExpressionNameScope   ← contains: f
       └─ FunctionScope            ← contains: params, var declarations
```

Source: [`FunctionExpressionNameScope.ts`](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/scope-manager/src/scope/FunctionExpressionNameScope.ts)

Our implementation adds the function expression name directly into the function scope:

```
outer scope
  └─ FunctionScope    ← contains: f (the name), params, var declarations
```

Source: [scope.ts#L89-L91](../../../src/transforms/scope.ts#L89)

**Practical effect:** In both cases, `f` is not visible in the outer scope. The self-recursive name is accessible inside the body. The difference only shows when introspecting the scope tree structure (e.g., ESLint rules that walk `scope.variables`).

### Notable divergence 2 — ClassScope

typescript-eslint creates a `ClassScope` for EVERY class (declaration and expression), always:

```js
class Foo extends Base {}
```

```
outer scope   ← Foo defined here (for declarations)
  └─ ClassScope  ← Foo defined here again (inner self-reference for heritage + body)
```

Source: [`ClassVisitor.ts#L50-L63`](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/scope-manager/src/referencer/ClassVisitor.ts#L50)

Our implementation only creates a scope for **named class expressions** (the self-binding case), not for class declarations or anonymous class expressions:

```js
const x = class Foo {} // ← creates Scope containing 'Foo'
class Foo {} // ← no extra scope; 'Foo' goes into current scope
```

Source: [scope.ts#L92-L100](../../../src/transforms/scope.ts#L92)

**Practical effect:** References to `Foo` from within a class declaration's heritage (`extends Foo {}`) resolve to the outer binding in our implementation. typescript-eslint would resolve them to the inner `ClassScope` binding. For the RSC use case this distinction doesn't matter because we're looking for free variable bindings, not inner self-references.

---

## Reference resolution strategy

### Ours: post-walk deferred resolution

1. Walk collects `{ id: Identifier, visitScope: Scope }` pairs without resolving.
2. After the walk (when all declarations are known), loop through raw refs and walk up the scope chain to find the declaring scope.

**Why:** Avoids `var`/function hoisting bugs. A reference before its `var` declaration in the same function would incorrectly resolve to an outer scope if resolved eagerly.

Source: [scope.ts#L51-L57](../../../src/transforms/scope.ts#L51)

### typescript-eslint: close-time resolution

1. During the walk each scope accumulates `leftToResolve: Reference[]`.
2. When a scope closes, it calls `close(scopeManager)` which tries to resolve each ref.
3. Unresolved refs are pushed to `through[]` and delegated to the upper scope via `delegateToUpperScope()`.

Source: [`ScopeBase.ts#close`](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/scope-manager/src/scope/ScopeBase.ts)

Both strategies resolve at "scope exit" time (when all local declarations are visible), so they handle hoisting correctly. The difference is organizational: ours is a single post-walk pass; typescript-eslint resolves incrementally per scope.

---

## Reference propagation

### Ours: push to ALL ancestor scopes

Every reference is added to `scopeToReferences` for its `visitScope` AND all ancestors up to the root. This makes it easy to ask "what identifiers are referenced inside scope X?" in O(1) at query time.

Source: [scope.ts#L169-L173](../../../src/transforms/scope.ts#L169)

### typescript-eslint: through[] chain

Unresolved references bubble up via `through[]`. To find all refs accessible from a scope you'd need to walk `scope.through` recursively — there's no pre-aggregated list like our `scopeToReferences`.

---

## `isReferenceIdentifier` / reference classification

We implement this ourselves in [scope.ts#L202](../../../src/transforms/scope.ts#L202), modeled after Vite SSR's `isRefIdentifier`. typescript-eslint delegates this to `PatternVisitor` and `Referencer`, which drive the walk and explicitly call `scope.referenceValue()` / `scope.referenceType()` only at reference positions — they never need a negative filter because they control which nodes trigger a reference call.

**Comment in our code:** `// TODO: review slop` — the positive-classifier approach is easier to audit but needs ongoing care as new node types are added.

---

## What typescript-eslint provides that we don't

1. **Read/Write flag on references** — knows if `x` is being read or written (or both).
2. **Definition kind** — `var` vs `let` vs `const` vs param vs import vs class name vs function name.
3. **`through[]`** — explicit "unresolved references" list per scope.
4. **TypeScript type-only references** — `ReferenceTypeFlag` distinguishes value vs type references.
5. **`ClassFieldInitializerScope` / `ClassStaticBlockScope`** — fine-grained scoping inside class bodies.
6. **`declaredVariables`** — `WeakMap<Node, Variable[]>` lets you go from any AST node back to what it declares.

---

## What we have that typescript-eslint doesn't

1. **`scopeToReferences` aggregation** — O(1) "all refs inside this scope" without recursion.
2. **Simpler model** — no Variable/Definition/Reference class hierarchy, just `Map<Identifier, Scope>`.
3. **Works on plain ESTree** — no TypeScript AST dependency.
