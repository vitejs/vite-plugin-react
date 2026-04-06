# scope.ts vs Next.js server action transform: comparison

**Our impl:** [src/transforms/scope.ts](../../../src/transforms/scope.ts)
**Prior art:** [github.com/vercel/next.js](https://github.com/vercel/next.js) — `crates/next-custom-transforms/src/transforms/server_actions.rs`

---

## How it works

Next.js implements its own **minimal, purpose-built** scope analysis in Rust as part of its SWC custom transform — not delegating to babel-traverse or SWC's generic scope APIs. The transform is embedded directly inside the server action visitor rather than extracted as a reusable module.

**Problem being solved:** Identify which outer-scope variables a `'use server'` function closes over so they can be serialized (encrypted) and passed as bound arguments at the call site.

```js
// input
export function Page() {
  const api_key = 'secret'
  async function action() {
    'use server'
    console.log(api_key)
  }
}

// output (simplified)
export const $$RSC_SERVER_ACTION_0 = async function action(
  $$ACTION_CLOSURE_BOUND,
) {
  const [$$ACTION_ARG_0] = await decryptActionBoundArgs(
    '...',
    $$ACTION_CLOSURE_BOUND,
  )
  console.log($$ACTION_ARG_0)
}
export function Page() {
  const api_key = 'secret'
  var action = $$RSC_SERVER_ACTION_0.bind(
    null,
    encryptActionBoundArgs('...', api_key),
  )
}
```

This is the same problem as our `getBindVars` — find the closure variables — but implemented at the SWC/Rust layer.

---

## Data model

### Ours

```
Scope (class, JS)
  declarations: Set<string>
  parent: Scope | undefined
  isFunction: boolean

ScopeTree
  referenceToDeclaredScope: Map<Identifier, Scope>
  scopeToReferences:        Map<Scope, Identifier[]>
  nodeScope:                Map<Node, Scope>
  moduleScope:              Scope
```

### Next.js

No `Scope` class. The visitor carries two flat Vecs as mutable state:

```rust
// on the ServerActions visitor struct (lines 249–250)
names:            Vec<Name>   // reference identifiers collected in current fn body
declared_idents:  Vec<Ident>  // declarations collected in current fn body

// Name = a base identifier + optional member access chain
struct NamePart { prop: Atom, is_member: bool, optional: bool }
struct Name(Id, Vec<NamePart>)
// e.g. `foo.bar?.baz` → Name(foo_id, [.bar, ?.baz])
// e.g. `x`            → Name(x_id, [])
```

`Id` is SWC's `(Symbol, SyntaxContext)` pair — the `SyntaxContext` encodes hygiene marks so two bindings named `x` in different scopes are distinguishable without a scope tree.

There is no scope tree, no parent chain, no node→scope map. The entire analysis is a single function body at a time.

---

## Scope types

Only **function boundaries** are modeled. Block scopes, catch scopes, class scopes — none of these create a new tracking context:

| Situation                      | Next.js                                   | Ours                                     |
| ------------------------------ | ----------------------------------------- | ---------------------------------------- |
| `function f() {}` / `() => {}` | new `declared_idents` snapshot            | `Scope(isFunction=true)`                 |
| `{ }` BlockStatement           | not modeled                               | `Scope(isFunction=false)`                |
| `for` / `for…in` / `for…of`    | not modeled                               | `Scope(isFunction=false)`                |
| `catch (e)`                    | not modeled                               | `Scope(isFunction=false)`                |
| `class {}`                     | not modeled (rejected for `'use server'`) | `Scope(isFunction=false)` for named expr |

Not modeling block scopes is fine for the specific goal: `var` declarations hoist to function scope anyway, and `let`/`const` inside the server action body should still be treated as "local" (not bound). The filter step (`retain_names_from_declared_idents`) handles this because it keeps only names matching the **outer** function's `declared_idents`.

---

## Resolution strategy

### Next.js: two-phase, flat, per-function-body

**Phase 1 (declarations):** While visiting the function body, `visit_mut_param` and `collect_decl_idents_in_stmt` push bindings into `declared_idents`. No tree built — just a flat Vec.

**Phase 2 (filter):** `retain_names_from_declared_idents` cross-references `names` against the **caller's** `declared_idents` snapshot — keeping only references whose base `Id` matches a declaration from the outer function scope.

```rust
current_declared_idents
    .iter()
    .any(|ident| ident.to_id() == name.0)  // Id comparison, hygiene-aware
```

Shadowing is handled implicitly by SWC's hygiene system: if the inner function re-declares `x`, the inner `x` and outer `x` have different `SyntaxContext` values, so they never match as the same `Id`.

### Ours: post-walk, full scope tree

We build a complete scope tree first, then resolve every `Identifier` reference against it. This gives us the answer for any scope, not just the outermost function boundary.

---

## Member access chains (`Name`)

The `Name` type is a notable addition over our approach. Instead of tracking only the base `Identifier`, Next.js tracks the full member access path:

```js
async function action() {
  'use server'
  console.log(config.api.key) // → Name(config_id, [.api, .key])
}
```

This allows the bound arg to be `config.api.key` (a property read) rather than just `config` (the whole object). The deduplication step then collapses `config` + `config.api.key` → `config` when both appear.

Our `getBindVars` only tracks the base identifier name, binding the full object even if only one property is used. The `TODO` comment in `scope.ts` acknowledges this as a future extension.

---

## `var` hoisting

Not explicitly modeled. SWC's parser handles the AST normalization, and the flat declaration collection (`collect_decl_idents_in_stmt`) picks up `var` declarations wherever they appear in the function body — the same effect as hoisting, without needing a two-pass approach.

---

## Known limitations (from source comments)

- `TODO` at line 340: parameters are assumed used if declared, not checked for actual reference.
- No block scope modeling means `let`/`const` declared in an inner block are not distinguished from outer ones (over-captures in edge cases).
- Only `foo.bar.baz` member chains; no computed properties (`foo[bar]`) or method calls in the bound expression.
- Class instance methods rejected outright — only static methods and top-level functions may have `'use server'`.

---

## What Next.js has that we don't

- **Member access chain tracking** (`Name` type) — can bind `config.api.key` instead of the whole `config` object.
- **Hygiene-aware Id comparison** — SWC's `SyntaxContext` handles shadowing without needing a scope tree at all.

## What we have that Next.js doesn't

- **Full scope tree** — works for any nesting depth, any query (not just "what does this one function close over?").
- **Block scope modeling** — correct `let`/`const` shadowing within the action body.
- **Language:** JS/TS — no Rust/SWC dependency; works with any ESTree parser.
