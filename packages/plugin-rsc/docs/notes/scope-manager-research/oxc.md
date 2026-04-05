# scope.ts vs oxc_semantic: comparison

**Our impl:** [src/transforms/scope.ts](../../../src/transforms/scope.ts)
**Prior art:** `~/code/others/oxc/crates/oxc_semantic/src/` (Rust)

oxc_semantic is the full semantic analysis pass of the oxc compiler — the heaviest implementation in this survey. It is designed as production compiler infrastructure, not a library for external callers.

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

### oxc_semantic

**Struct-of-Arrays (SoA) layout** — all symbols stored in parallel arrays indexed by `SymbolId` (u32), all scopes in parallel arrays indexed by `ScopeId` (u32), all references by `ReferenceId` (u32). No heap-allocated objects per symbol/scope/reference.

```rust
// Core output (Scoping / ScopingInner)

// Symbols — parallel arrays indexed by SymbolId
symbol_spans:    Vec<Span>         // source position
symbol_flags:    Vec<SymbolFlags>  // var/let/const/class/fn/import/TS variants…
symbol_scope_ids: Vec<ScopeId>    // declaring scope
symbol_declarations: Vec<NodeId>  // declaring AST node

symbol_names:    ArenaVec<Ident>  // string-interned names (arena allocator)
resolved_references: ArenaVec<ArenaVec<ReferenceId>>  // per-symbol reference lists
symbol_redeclarations: FxHashMap<SymbolId, ArenaVec<Redeclaration>>  // lazy, only if redeclared

// Scopes — parallel arrays indexed by ScopeId
parent_ids: Vec<Option<ScopeId>>
node_ids:   Vec<NodeId>
flags:      Vec<ScopeFlags>
bindings:   IndexVec<ScopeId, ArenaIdentHashMap<SymbolId>>  // name → SymbolId per scope

// References
// per-node reference struct:
Reference {
  node_id:   NodeId           // the IdentifierReference AST node
  symbol_id: Option<SymbolId> // resolved target; None = unresolved
  scope_id:  ScopeId          // scope where the reference appears
  flags:     ReferenceFlags   // Read | Write | Type | ValueAsType | Namespace
}
root_unresolved_references: ArenaIdentHashMap<ArenaVec<ReferenceId>>  // globals
```

**Key point:** there are no `Scope` objects or `Symbol` objects on the heap. A "scope" is just an index into several parallel arrays. This is the largest architectural difference from every JS implementation in this survey.

---

## Symbol flags

`SymbolFlags` covers all JS + TypeScript declaration kinds:

```
FunctionScopedVariable | BlockScopedVariable | ConstVariable
Class | Function | CatchVariable
Import | TypeImport
TypeAlias | Interface | RegularEnum | ConstEnum | EnumMember
TypeParameter | NamespaceModule | ValueModule | Ambient
```

Composite: `Variable = FunctionScopedVariable | BlockScopedVariable | ConstVariable`, `BlockScoped = BlockScopedVariable | ConstVariable | Class`, etc.

Ours has none of this — `Set<string>` treats all declaration kinds identically.

---

## Scope types created

| Situation                                                      | oxc_semantic                                | Ours                      |
| -------------------------------------------------------------- | ------------------------------------------- | ------------------------- |
| `Program`                                                      | `ScopeFlags::Top`                           | `moduleScope`             |
| `function f() {}` / `() => {}`                                 | `ScopeFlags::Function`                      | `Scope(isFunction=true)`  |
| Arrow fn                                                       | `ScopeFlags::Function \| Arrow`             | `Scope(isFunction=true)`  |
| `{ }` BlockStatement                                           | `ScopeFlags::empty()`                       | `Scope(isFunction=false)` |
| `for` / `for…in` / `for…of`                                    | `ScopeFlags::empty()`                       | `Scope(isFunction=false)` |
| `catch (e)`                                                    | `ScopeFlags::CatchClause`                   | `Scope(isFunction=false)` |
| `switch`                                                       | not created (no separate scope)             | `Scope(isFunction=false)` |
| `class {}`                                                     | `ScopeFlags::StrictMode` (always one scope) | named-expr only           |
| `class {}` static block                                        | `ScopeFlags::ClassStaticBlock`              | not handled               |
| `with (x) {}`                                                  | `ScopeFlags::With`                          | not handled               |
| TypeScript: namespace, interface, type param, conditional type | dedicated flags                             | not handled               |

**switch** is absent in oxc_semantic (same gap as vite-ssr, opposite of ours).

---

## Named function expressions

Name binds in the **function's own scope**, same as ours:

```
outer scope
└── function scope   ← 'f' declared here, same scope as params
    └── body
```

The function scope is entered before the name is bound (`enter_scope` → `func.bind(self)`), so `f` cannot be seen from the outer scope. If a parameter also named `f` exists, the parameter shadows it — this redeclaration is detected and handled explicitly.

---

## Class scopes

oxc_semantic creates **one `ClassScope`** for every class (declaration or expression), always:

```js
class Foo extends Base {}
```

```
outer scope   ← Foo declared here (class declaration)
└── ClassScope (StrictMode)  ← Foo also declared here (self-reference)
```

Named class expression: name binds inside the class scope (not in the outer scope). Anonymous class expression: still creates the `ClassScope`, just no name binding.

This matches typescript-eslint's `ClassScope` behavior. Our implementation only creates a scope for named class expressions.

---

## Reference resolution

### Strategy: walk-up with checkpoint-based early resolution

**Normal resolution** happens in a post-walk pass (`resolve_all_references`): after the entire AST is visited, each unresolved reference walks up the scope chain via `scope_parent_id()` until it finds a `bindings` entry with the matching name.

**Early (checkpoint) resolution** fires at specific points during the walk to handle forward-reference constraints:

- After function parameters are visited (before the body) — prevents params from binding to body declarations
- After catch parameters — prevents the catch param from binding to the catch body

The checkpoint mechanism saves the current position in the flat unresolved-references list; everything before the checkpoint is resolved against the current scope chain, leaving the rest for later.

This is more nuanced than our single post-walk pass, which resolves everything at once (sufficient because we never need the checkpoint separation).

### Walk-up vs bubble-up

typescript-eslint and eslint-scope use a **bubble-up** strategy: each scope maintains a `through[]` / `leftToResolve[]` queue; on scope close, unresolved refs are pushed to the parent. This is N scope-exit operations.

oxc_semantic uses a **walk-up** strategy: one flat list of unresolved references, each resolved by walking the scope chain at the end. Better cache locality, no per-scope-exit work.

Our approach is also walk-up (post-walk flat loop), same principle.

---

## `var` hoisting

Handled during the walk via an explicit hoisting tracker:

1. When a `var` declaration is encountered, walk up the scope chain collecting block scopes.
2. Stop at the first scope with `flags.is_var()` (Top / Function / ClassStaticBlock / TsModuleBlock).
3. Check for redeclaration in all intermediate scopes via both `bindings` and a side-table `hoisting_variables: FxHashMap<ScopeId, IdentHashMap<SymbolId>>`.
4. Bind the symbol in the target scope.
5. If the binding was temporarily placed in an intermediate scope, move it (`move_binding`).

The separate `hoisting_variables` side-table is needed so that redeclaration checks during the walk can see hoisted vars even before they've been moved to their final scope.

Our approach is simpler: at declaration time, call `getNearestFunctionScope()` and add directly to that scope. No side-table needed because we only store names (strings), not node references.

---

## Public API

```rust
SemanticBuilder::new()
  .with_check_syntax_error(bool)
  .with_cfg(bool)
  .build(&program)
  → SemanticBuilderReturn { semantic, errors }

// Query APIs on Scoping:
scoping.symbol_name(id)          // &str
scoping.symbol_flags(id)         // SymbolFlags
scoping.symbol_scope_id(id)      // ScopeId
scoping.symbol_declaration(id)   // NodeId
scoping.get_resolved_references(id)  // Iterator<&Reference>
scoping.symbol_is_mutated(id)    // bool
scoping.symbol_is_unused(id)     // bool
scoping.root_unresolved_references()  // globals

scoping.scope_flags(id)          // ScopeFlags
scoping.scope_parent_id(id)      // Option<ScopeId>
scoping.scope_ancestors(id)      // Iterator<ScopeId>
scoping.find_binding(scope, name)  // Option<SymbolId>  (walks up)
scoping.get_binding(scope, name)   // Option<SymbolId>  (this scope only)
scoping.iter_bindings_in(scope)  // Iterator<SymbolId>
```

---

## What oxc_semantic has that we don't

- **SoA / arena memory model** — compiler-grade performance, no per-symbol heap allocation.
- **SymbolFlags** — full declaration-kind information (var/let/const/class/fn/import/TS variants).
- **ReferenceFlags** — Read/Write/Type per reference.
- **Redeclaration tracking** — knows when a name is declared more than once and stores all sites.
- **`symbol_is_mutated` / `symbol_is_unused`** — derived facts useful for linting/optimization.
- **TypeScript type-space** — separate type vs value reference tracking.
- **ClassScope always** (not just named expressions), ClassStaticBlock scope.
- **`with` scope**, strict-mode propagation, direct-eval propagation.
- **Checkpoint early resolution** — correct forward-reference semantics for params.

## What we have that oxc_semantic doesn't

- **`scopeToReferences` aggregation** — O(1) "all refs inside scope X" without a walk. oxc_semantic has `get_resolved_references(symbol_id)` (per symbol) but no pre-aggregated per-scope list of all references.
- **JS/TS implementation** — works with any ESTree parser; no Rust toolchain required.
- **Simplicity** — ~300 lines vs ~4000+ lines across multiple files.
