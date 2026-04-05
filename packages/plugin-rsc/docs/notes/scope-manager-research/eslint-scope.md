# scope.ts vs eslint-scope: comparison

**Our impl:** [src/transforms/scope.ts](../../../src/transforms/scope.ts)
**Prior art:** `~/code/others/eslint-js/packages/eslint-scope/`

eslint-scope is the original ECMA-262 scope analyzer for ESTree ASTs that typescript-eslint was built on top of. The interface it defines (`ScopeManager`, `Scope`, `Variable`, `Reference`) became the standard that all subsequent JS scope tools reference.

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

### eslint-scope

```js
Scope
  type:                    string          // one of 12 ScopeType variants
  block:                   ESTree.Node     // the AST node that created this scope
  upper:                   Scope | null    // parent scope
  childScopes:             Scope[]
  isStrict:                boolean
  variables:               Variable[]      // declarations in this scope
  set:                     Map<string, Variable>  // name → Variable
  references:              Reference[]     // references created in this scope
  through:                 Reference[]     // unresolved refs delegated to parent
  variableScope:           Scope           // nearest function/global/module scope (for var)
  functionExpressionScope: boolean         // true only for FunctionExpressionNameScope
  dynamic:                 boolean         // true for global/with scopes
  directCallToEvalScope:   boolean
  thisFound:               boolean

Variable
  name:        string
  scope:       Scope
  identifiers: ESTree.Identifier[]   // all declaration nodes
  references:  Reference[]           // all uses
  defs:        Definition[]          // where declared (with kind/node/parent)

Reference
  identifier:  ESTree.Identifier     // the specific identifier node
  from:        Scope                 // scope where the reference appears
  resolved:    Variable | null       // null = global/undeclared
  flag:        READ=1 | WRITE=2 | RW=3
  writeExpr?:  ESTree.Expression     // rhs if write
  init?:       boolean               // is this an initializer write

Definition
  type:    string    // CatchClause | Parameter | FunctionName | ClassName | Variable | ImportBinding
  name:    ESTree.Identifier
  node:    ESTree.Node     // enclosing declaration node
  parent?: ESTree.Node     // statement node
  kind?:   "var" | "let" | "const"
```

**Key difference:** eslint-scope is Variable-centric — a `Variable` groups all declaration sites (`defs`, `identifiers`) and all use sites (`references`) for one name. Our model has no `Variable` objects; we map each `Identifier` directly to the `Scope` that declares it.

---

## Scope types

All 12 `ScopeType` variants:

| Type                         | Node                                                               | Notes                                             |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| `"global"`                   | Program                                                            | root scope                                        |
| `"module"`                   | Program                                                            | in ES module context, child of global             |
| `"function"`                 | FunctionDeclaration / FunctionExpression / ArrowFunctionExpression |                                                   |
| `"function-expression-name"` | FunctionExpression (named)                                         | contains only the fn name                         |
| `"block"`                    | BlockStatement                                                     | ES6+ only                                         |
| `"catch"`                    | CatchClause                                                        |                                                   |
| `"with"`                     | WithStatement                                                      |                                                   |
| `"for"`                      | For/ForIn/ForOf                                                    | only when init/left has `let`/`const` (not `var`) |
| `"switch"`                   | SwitchStatement                                                    | ES6+                                              |
| `"class"`                    | ClassDeclaration / ClassExpression                                 | always created                                    |
| `"class-field-initializer"`  | PropertyDefinition value                                           | each field initializer has own scope              |
| `"class-static-block"`       | StaticBlock                                                        |                                                   |

Notable: `for` scope only created for `let`/`const` loops — a `var` for-loop does not get a ForScope. Our implementation creates a scope for all for-loops.

---

## FunctionExpressionNameScope

Yes — same as typescript-eslint, which inherited this design. A named function expression creates **two** scopes:

```
outer scope
└── FunctionExpressionNameScope   ← contains only: f (type "function-expression-name")
    └── FunctionScope             ← contains: params, var declarations
```

```js
// (function f() {}) creates:
// 1. FunctionExpressionNameScope { variables: [Variable{name:"f"}] }
// 2. FunctionScope { variables: [params...] }
```

Our implementation puts `f` directly into the function scope. Functionally equivalent for resolution but different structural shape.

---

## Class scopes

A `ClassScope` is created for every class (declaration and expression). The class name is declared **twice**: once in the outer scope (for declarations), and once inside the `ClassScope` (self-reference):

```js
class Foo extends Base {}
// outer scope ← Foo defined here (ClassDeclaration)
// └── ClassScope ← Foo also defined here (inner self-reference)
```

Each class field initializer additionally gets its own `ClassFieldInitializerScope`.

---

## Reference resolution: close-time bubble-up

1. During the walk, `scope.__referencing(identifier)` adds a `Reference` to `scope.__left`.
2. When a scope closes, `scope.__close()` iterates `__left` and tries to resolve each ref via `scope.__resolve()` — a direct lookup in `scope.set`.
3. Unresolved refs are passed to the parent via `scope.__delegateToUpperScope(ref)`, which adds them to the parent's `through[]` and `__left`.
4. This repeats up the chain until reaching GlobalScope, where unresolved refs become implicit globals.

Because declarations are registered during the walk (before close), all local declarations are visible when `__close()` runs — this correctly handles `var` hoisting and function declarations within the same scope.

Our post-walk loop achieves the same result differently: we collect `{ id, visitScope }` pairs during the walk and resolve them all in one pass after the walk is complete.

**Default parameter edge case:** eslint-scope has special logic in `FunctionScope.__isValidResolution()` that prevents references in default parameter expressions from resolving to variables declared in the function body (references at position < body start cannot resolve to declarations at position >= body start). Our implementation doesn't handle this.

---

## `var` hoisting

`var` declarations are registered directly into `scope.variableScope` (the nearest function/global/module scope) rather than the current block scope:

```js
// in referencer.js:
const variableTargetScope =
  node.kind === 'var'
    ? this.currentScope().variableScope // hoist
    : this.currentScope() // let/const stay local
```

`variableScope` is set at scope construction time — for function/global/module scopes it points to self; for block scopes it points upward to the nearest function scope. This is equivalent to our `getNearestFunctionScope()`.

---

## Public API

```js
analyze(tree, options) → ScopeManager

ScopeManager
  .scopes: Scope[]
  .globalScope: GlobalScope
  .acquire(node, inner?): Scope | null      // scope for a node
  .release(node, inner?): Scope | null      // parent scope of a node
  .getDeclaredVariables(node): Variable[]   // variables declared by a node
```

---

## What eslint-scope has that we don't

- `Variable` objects linking all defs and all uses for one name.
- `Reference` read/write flag and `writeExpr` — knows if an identifier is being written.
- `Definition` kind — `var` vs `let` vs `const` vs param vs import vs class name.
- `through[]` — explicit unresolved-reference chain per scope.
- `FunctionExpressionNameScope` — separate scope for function expression name.
- `ClassScope` for every class, `ClassFieldInitializerScope`, `ClassStaticBlockScope`.
- Default-parameter forward-reference guard.
- `with` scope, strict-mode detection.
- `eval()` dynamic scope propagation.

## What we have that eslint-scope doesn't

- `scopeToReferences` aggregation — O(1) "all refs inside scope X".
- Simpler data model — no Variable/Definition/Reference class hierarchy.
- Named class expression scope (self-binding correctly isolated without a full ClassScope).
