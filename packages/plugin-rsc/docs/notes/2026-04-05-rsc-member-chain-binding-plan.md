# RSC Member-Chain Binding Plan

## Goal

Implement the feature gap called out in [src/transforms/scope.ts#L129](../../src/transforms/scope.ts#L129) and the Next.js comparison note at [scope-manager-research/nextjs.md#L126](./scope-manager-research/nextjs.md#L126):

- track `config.api.key` as a closure capture instead of only `config`
- keep declaration resolution anchored on the root identifier (`config`)
- preserve current shadowing correctness from the custom scope tree

## RSC binding semantics

Understanding why binding matters requires knowing what happens at runtime.

When a server component renders a `'use server'` function, the transform produces:

```js
const action = $$register($$hoist_0_action, ...).bind(null, config.api.key)
```

The `.bind(null, ...)` arguments are evaluated **at render time on the server**. The resulting bound function reference is then serialized into the RSC payload and sent to the client. The client holds an opaque reference. When the user invokes the action (e.g. submits a form), the client sends the action ID and the bound args back to the server, which deserializes them and reconstructs the call.

So bound values travel over the network: **they must be React-serializable** (plain objects, arrays, primitives, Dates, Sets, Maps — but not class instances with methods, functions, or other non-serializable types).

The `encode`/`decode` option in `transformHoistInlineDirective` is a separate concern — it is an encryption layer applied on top of this transport, not the transport itself.

### Implication for member-chain binding

Binding the root object (`config`) means the whole object travels the wire. If `config` contains non-serializable parts, the action will fail at runtime.

Binding only the needed paths is therefore preferable: the bound value is more likely to be a primitive or a small serializable subtree.

Both the partial-object approach and the synthetic-local approach are safer than the current behavior of binding the full root object. The difference between them is shape, not serializability.

## Key finding

This is **not** a `scope.ts`-only change.

Current `getBindVars` in [src/transforms/hoist.ts#L171](../../src/transforms/hoist.ts#L171) returns plain strings that are used in two different roles:

1. as the bound expression list for `.bind(null, ...)`
2. as the hoisted function parameter names / decode destructuring targets

That works for identifiers like `value`, but breaks for member paths like `config.api` because:

- `config.api` is valid as a bound expression
- `function hoisted(config.api) {}` is invalid syntax
- `const [config.api] = decode(...)` is also invalid syntax

The chosen design below solves this by keeping the root identifier name as the parameter and synthesizing the bind expression as a partial object.

## Current code points

- Scope collection TODO: [src/transforms/scope.ts#L129](../../src/transforms/scope.ts#L129)
- Scope tree types: [src/transforms/scope.ts#L37](../../src/transforms/scope.ts#L37)
- Bind-var extraction: [src/transforms/hoist.ts#L171](../../src/transforms/hoist.ts#L171)
- Hoist codegen uses `bindVars` as both params and bound args: [src/transforms/hoist.ts#L69](../../src/transforms/hoist.ts#L69)
- Scope serializer assumes every reference is an `Identifier`: [src/transforms/scope.test.ts#L62](../../src/transforms/scope.test.ts#L62)

## Chosen design: partial-object binding under the root name

Keep the original root variable name as the hoisted function parameter. Instead of binding the whole root object, synthesize a partial object at the call site that reconstructs just enough shape for the accessed paths.

Example:

```js
function Page() {
  const config = getConfig()

  async function action() {
    'use server'
    return config.api.key
  }
}
```

Output:

```js
function Page() {
  const config = getConfig()
  const action = $$register($$hoist_0_action, '<id>', '$$hoist_0_action').bind(
    null,
    { api: { key: config.api.key } },
  )
}

export async function $$hoist_0_action(config) {
  'use server'
  return config.api.key
}
```

When the root itself is accessed directly, bind it as-is (same as current behavior):

```js
async function action() {
  'use server'
  return config === globalConfig
}
// → .bind(null, config)
// → function $$hoist_0_action(config)
```

No body rewrite is needed. The hoisted function keeps the original source expressions.

### Multiple paths from the same root

When the body accesses multiple paths from the same root, the partial objects are merged:

```js
async function action() {
  'use server'
  return [config.api.key, config.user.name]
}
```

Output:

```js
.bind(null, { api: { key: config.api.key }, user: { name: config.user.name } })
export async function $$hoist_0_action(config) {
  return [config.api.key, config.user.name]
}
```

### Dedupe: root access covers all member paths

If the body accesses both the root and a member path from the same root, the root wins and no partial object is needed:

```js
return [config.api.key, Object.keys(config)]
// config is accessed directly → bind config, not a partial object
```

This matches the prefix-dedupe rule: a shorter prefix covers all longer paths.

## Implementation plan

### 1. Extend `scope.ts` reference collection

Keep `scopeToReferences` as `Map<Scope, Identifier[]>` and `referenceToDeclaredScope` as `Map<Identifier, Scope>` — both unchanged. Add one new field to `ScopeTree`:

```ts
referenceToNode: Map<Identifier, Identifier | MemberExpression>
```

This maps each root reference identifier to the outermost bindable node: the identifier itself if there is no non-computed member chain, or the outermost `MemberExpression` rooted at it otherwise.

During the walk, for each qualifying identifier, compute the outermost bindable node and store the pair:

- `scopeToReferences` and `referenceToDeclaredScope` receive the root `Identifier` as before
- `referenceToNode` additionally stores `id → node`

For `x.y.z`, `referenceToNode` maps `x → MemberExpression(x.y.z)`.

For `x[y].z`, the chain is broken by the computed access, so `referenceToNode` maps `x → Identifier(x)`.

Suggested helper in `scope.ts`:

```ts
function getOutermostBindableReference(
  id: Identifier,
  parentStack: Node[],
): Identifier | MemberExpression
```

It can reuse the existing ancestor stack already built in `buildScopeTree`.

### 2. Keep declaration resolution keyed by the root identifier

`referenceToDeclaredScope` remains `Map<Identifier, Scope>`.

The declaration walk stays exactly rooted on `id.name`, not the member path. This keeps current shadowing behavior intact and avoids inventing fake declarations for properties.

### 3. Add bind-var extraction that understands member paths

Replace the current `getBindVars(): string[]` with something richer:

```ts
type BindVar = {
  root: string // param name and dedupe key, e.g. "config"
  expr: string // bind expression, e.g. "{ api: { key: config.api.key } }" or "config"
}
```

Filtering logic is the same as today — `scopeToReferences` and `referenceToDeclaredScope` are unchanged:

- take the function scope's propagated references (`Identifier[]`)
- keep only those declared in ancestor scopes excluding module scope

Then for each kept identifier, look up `referenceToNode` to get the bindable node (`Identifier` or `MemberExpression`), and extract its path for dedupe and synthesis.

Then group by root and apply prefix dedupe to produce an antichain:

**Antichain invariant**: no retained capture should be a prefix of another. For any two captured paths where one is a prefix of the other, discard the longer one.

Examples:

- `config` + `config.api.key` → keep `config`
- `config.api` + `config.api.key` → keep `config.api`
- `config.api` + `config.user.name` → keep both (neither is a prefix of the other)

This must apply at every depth, not just at root level. Once the antichain is computed:

- if a retained capture is the root identifier itself, bind it directly: `{ root: "config", expr: "config" }`
- otherwise, synthesize a partial object from the retained paths (see step 4)

### 4. Synthesize partial-object bind expressions

For each root with only member-path references (no direct root access), build a nested object literal from the antichain-deduplicated path set.

Because the paths form an antichain, no path is a prefix of another. The trie therefore has no leaf/branch collisions: every node is either an internal node (has children only) or a leaf (a retained capture). Serialization is unambiguous.

Example path set for `config` after dedupe: `[["api", "key"], ["user", "name"]]`

Algorithm:

1. Build a path tree (trie over path segments)
2. Serialize the trie to an object literal string, with each leaf node being the original source expression

```
["api", "key"]       → api: { key: config.api.key }
["user", "name"]     → user: { name: config.user.name }
merged               → { api: { key: config.api.key }, user: { name: config.user.name } }
```

If a retained path ends at an intermediate node (e.g. `["api"]` retained, meaning `config.api` is captured directly), the value at that node is the source expression for that path, not a further-nested object:

```
["api"]              → api: config.api
```

This is also what keeps the approach semantics-preserving for broader intermediate reads. For `return [config.api.key, Object.keys(config.api)]`, the reference set contains both `config.api` and `config.api.key`. Antichain dedupe keeps `config.api` and discards `config.api.key`. The bound object is `{ api: config.api }`, so the hoisted body receives the real `config.api` object and `Object.keys(config.api)` behaves correctly.

### 5. Update hoist codegen

After the above, hoist generation uses:

- bound arg: the synthesized `expr` string
- param / decode local: the `root` name

Without `decode`:

```js
const action = $$register($$hoist_0_action, ...).bind(null, { api: { key: config.api.key } })
export async function $$hoist_0_action(config) {
  "use server"
  return config.api.key
}
```

With `decode`:

```js
const action = $$register(...).bind(null, encode([{ api: { key: config.api.key } }]))
export async function $$hoist_0_action($$hoist_encoded) {
  "use server"
  const [config] = decode($$hoist_encoded)
  return config.api.key
}
```

### 6. Update tests

#### `scope.test.ts`

Serializer must support `MemberExpression` references instead of assuming `.name`.

Suggested display format:

- identifier: `value`
- member chain: `config.api.key`

This will require updating snapshots under `packages/plugin-rsc/src/transforms/fixtures/scope/**`.

#### `hoist.test.ts`

Add focused cases for:

1. plain member chain capture

```js
function outer() {
  const config = { api: { key: 'x' } }
  async function action() {
    'use server'
    return config.api.key
  }
}
```

Expected: bind `{ api: { key: config.api.key } }`, param `config`, body unchanged.

2. multiple paths merged

```js
return [config.api.key, config.user.name]
```

Expected: bind `{ api: { key: config.api.key }, user: { name: config.user.name } }`.

3. root access covers member path (dedupe)

```js
return [config, config.api.key]
```

Expected: bind `config` only.

4. computed boundary

```js
return config[key].value
```

Expected: fall back to binding `config` (identifier-level capture).

## Suggested scope for first implementation

Keep the first pass intentionally narrow:

- support only non-computed `MemberExpression` chains
- no optional chaining yet
- no broader refactor of the scope walker

Callee trimming is required, not optional. Without it, `config.api.get()` produces `{ api: { get: config.api.get } }`, which detaches the method from its receiver and breaks `this` semantics. The capture-selection step must trim the final segment in callee position before dedupe and synthesis run.

## Open questions before coding

1. Callee trimming rule

Callee trimming is required for correctness (see "Suggested scope" above). The implementation should follow Next.js: trim the final segment from any member-path capture that appears in callee position, capturing the receiver instead of the method.

Next.js detail:

- `visit_mut_callee` sets `in_callee = true`
- `visit_mut_expr` collects a `Name`
- when `in_callee` is true, it does `name.1.pop()`

Additional nuance: `Name::try_from` supports `Expr::Member` and member-shaped `Expr::OptChain` but rejects `OptChainBase::Call`, so optional-call shapes are not handled by the member-path capture path.

Relevant source:

- [server_actions.rs#L1708](https://github.com/vercel/next.js/blob/main/crates/next-custom-transforms/src/transforms/server_actions.rs#L1708)
- [server_actions.rs#L1719](https://github.com/vercel/next.js/blob/main/crates/next-custom-transforms/src/transforms/server_actions.rs#L1719)
- [server_actions.rs#L3698](https://github.com/vercel/next.js/blob/main/crates/next-custom-transforms/src/transforms/server_actions.rs#L3698)
- [server_actions.rs#L3729](https://github.com/vercel/next.js/blob/main/crates/next-custom-transforms/src/transforms/server_actions.rs#L3729)

This rule applies equally to both the partial-object and synthetic-local approaches — it is a capture-selection decision made before binding shape is determined.

2. Should `scope.ts` support optional chaining now or later?

Next.js models optional access in `NamePart`. Our TODO and current AST utilities do not.

## Proposed execution order

1. Add `ScopeReference` and update `scope.test.ts` serializer/snapshots.
2. Add `getBindVars` replacement that returns structured bind vars with path-tree synthesis and prefix dedupe.
3. Update hoist codegen to use `root` as param and `expr` as bind arg.
4. Add hoist tests for plain member access, multiple paths, dedupe, and computed fallback.
5. Decide whether to include callee trimming in the same change or a follow-up.

---

## Appendix: synthetic-local approach (Next.js style)

An alternative design closer to Next.js binds the exact captured leaf value and rewrites the hoisted function body to use synthetic locals instead of the original expressions.

Example output for `return config.api.key`:

```js
.bind(null, config.api.key)
export async function $$hoist_0_action($$hoist_arg_0) {
  "use server"
  return $$hoist_arg_0
}
```

For multiple paths:

```js
.bind(null, config.api.key, config.user.name)
export async function $$hoist_0_action($$hoist_arg_0, $$hoist_arg_1) {
  return [$$hoist_arg_0, $$hoist_arg_1]
}
```

### Why more involved

This approach requires a body rewrite pass before moving the function: every occurrence of a captured expression in the function body must be replaced with the corresponding synthetic local. This includes special handling for object shorthand:

```js
return { config }
// config is captured and renamed to $$hoist_arg_0
// must become: return { config: $$hoist_arg_0 }
// naive replacement would produce: return { $$hoist_arg_0 } ← wrong property name
```

The rewrite is also not a simple node-to-node substitution — it must operate against the final dedupe-resolved capture set, because a broader capture (e.g. `config`) subsumes narrower ones (e.g. `config.api.key`) and the body references to the narrower path must be rewritten through the broader local:

```js
// dedupe keeps config → $$hoist_arg_0, drops config.api.key
return { config, key: config.api.key }
// becomes:
return { config: $$hoist_arg_0, key: $$hoist_arg_0.api.key }
```

Next.js implements this as `ClosureReplacer`:

- [server_actions.rs#L3637](https://github.com/vercel/next.js/blob/main/crates/next-custom-transforms/src/transforms/server_actions.rs#L3637)
- [server_actions.rs#L3649](https://github.com/vercel/next.js/blob/main/crates/next-custom-transforms/src/transforms/server_actions.rs#L3649)

### `BindVar` shape for this approach

```ts
type BindVar = {
  key: string // stable dedupe key, e.g. "config", "config.api", "config.api.key"
  expr: string // source expression to bind, e.g. "config.api.key"
  local: string // synthetic local used inside hoisted fn, e.g. "$$hoist_arg_0"
  root: Identifier // declaration lookup still uses the root identifier
}
```

The separation:

- `root` answers "which scope declared this capture?"
- `expr` answers "what value should be bound at the call site?"
- `local` answers "what identifier should replace references inside the hoisted function?"

### Range-based rewrite variant (third approach)

There is a middle-ground between full synthetic-local and partial-object, seen in an open PR ([vitejs/vite-plugin-react#1157](https://github.com/vitejs/vite-plugin-react/pull/1157)):

Instead of a separate body rewrite pass, source ranges for each captured node are collected **during the analysis walk** alongside the scope information. The rewrite is then just a series of `output.update(start, end, param + suffix)` calls — no second AST traversal.

The suffix handles prefix dedupe: if `config.cookies` is retained over `config.cookies.names`, the `config.cookies.names` occurrence is rewritten to `$$bind_0_config_cookies` + `.names`. The suffix carries the remaining path.

Importantly, plain identifier captures (`config` with no member path) keep the original name as the param — no synthetic local, no shorthand problem. Only member-path captures get a synthetic param like `$$bind_0_config_api_key`.

This gives lighter body rewrite than full synthetic-local (no second walk, no shorthand special-casing for member paths) while still binding leaf values rather than constructing partial objects. Worth considering if the partial-object trie synthesis turns out to be complex in practice.
