# Mixed-directive Composition

- Repo: git@github.com:vitejs/vite-plugin-react.git
- Commit: 31cdbb82219b6b637eee338a3492f735c78116bf
- Branch: main
- Next.js repo: git@github.com:vercel/next.js.git
- Next.js commit: 153bf8ac5fa00888ef5fbb2b65cac12f0942a44f
- Next.js branch: canary
- Reviewed: 2026-07-24

## Question

Can independent directive-owner plugins correctly compose a module-level `"use server"` default with an inline custom Server Function override, or must one transform classify both roles before generating exports, wrappers, proxies, and server-reference claims?

The focused plugin-rsc prototype extends the `custom-server-function` E2E with this shape:

```js
'use server'

export async function getCount() {
  return count
}

export async function increment() {
  'use custom-server'
  count++
}

export async function reset() {
  count = 0
}
```

`"use custom-server"` stands in for a framework-owned directive such as `"use cache"`. The important semantic is that the inline directive overrides the module-level default for one exported function while the remaining exports retain built-in `"use server"` ownership.

## Conclusion

The current independent transforms do not compose this override correctly in either plugin order.

Running the custom transform first preserves the inline role, but it exports and claims a generated hoist. The subsequent built-in module-level transform treats every resulting export as `"use server"`, including that generated hoist. Claim aggregation then rejects the same reference export being owned by both plugins. Even without that check, the built-in pass would re-register the custom wrapper and erase the intended single-owner role distinction.

Running the built-in transform first prevents the duplicate generated-export claim, but its generated registration assignment assumes the original function binding remains reassignable. The later custom hoister replaces that declaration with a `const`, so module evaluation attempts to reassign a `const`. The non-RSC built-in proxy pass also consumes the function body before the custom plugin can select different proxy ownership.

The required invariant is stronger than transform order:

> Module defaults and inline overrides must be classified together before any pass commits export names, wrapper targets, client proxies, or server-reference ownership.

The recommended direction is one role-aware traversal with directive-owner callbacks. This does not require plugin-rsc to hardcode `"use cache"` semantics. The built-in and framework-owned directives can provide separate runtime behavior while sharing syntax classification and final export ownership.

## Next.js One-pass Baseline

Next.js implements actions and cache functions in one `server_actions` visitor. It records and removes the module directive in [`get_directive_for_module`](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L453-L475), then pre-collects exports and performs one main statement pass in [`visit_mut_module_items`](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L1741-L1755).

For each function, an inline directive takes precedence. Only an exported function without its own directive inherits the file directive in [`get_directive_for_function`](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L413-L450).

Consequently:

- A `"use server"` file may contain an inline `"use cache"` function. [Fixture 37](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/37/input.js) covers a local cached function, while [fixture 48](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/48/input.js#L1-L45) covers an exported cached override among ordinary action exports.
- A default export may override a `"use server"` file with inline `"use cache"`, as shown by [fixture 49](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/49/input.js).
- The reverse is legal. Inline `"use server"` functions override a module-level `"use cache"` role in [fixture 51](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/51/input.js).
- Both directives in one directive prologue are rejected by the shared [`DirectiveVisitor`](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L3418-L3490).

For an exported cache override among ordinary actions, the normalized result is:

```js
const H = async function cached(value) {
  return value
}

export var CACHE_REF = cacheWrapper(H, CACHE_ID)
registerServerReference(CACHE_REF, CACHE_ID, null)
export var cached = CACHE_REF

export async function action(value) {
  return value
}
registerServerReference(action, ACTION_ID, null)
```

The cache override is classified before the action-file post-pass. It is removed from ordinary action export registration and replaced by the cache wrapper and cache reference, as [fixture 48's exact output](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/48/output.js#L27-L50) demonstrates.

## Intended Vite Composition Prototype

The current custom Server Function example installs `customServerFunctionPlugin()` before `rsc()` in [`vite.config.ts`](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/examples/custom-server-function/vite.config.ts#L1-L8).

The custom plugin mirrors the built-in environment split. In the RSC environment it applies `transformWrapExport` for a module-level custom directive or `transformHoistInlineDirective` for inline custom directives, then contributes the returned names as its server-reference claim. In client and SSR environments it proxies only module-level custom-directive exports. This pipeline is implemented in [`custom-server-function-plugin.ts`](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/examples/custom-server-function/custom-server-function-plugin.ts#L18-L102).

The built-in `rsc:use-server` plugin runs afterward. A top-level `"use server"` makes `transformServerActionServer` choose `transformWrapExport`, which wraps every export rather than inspecting inline directives in [`server-action.ts`](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/src/transforms/server-action.ts#L30-L39).

PR #1310's claim manager correctly aggregates disjoint exports from different owners and rejects duplicate ownership in [`server-reference.ts`](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/src/plugins/server-reference.ts#L69-L124). That solves metadata lifecycle after ownership has been decided. It does not decide which transform owns an export.

## Custom Then Built-in

The custom inline hoister produces this normalized intermediate form:

```js
'use server'

export async function getCount() {
  return count
}

export const increment = CUSTOM_REGISTER(G)

export async function reset() {
  count = 0
}

export async function G() {
  'use custom-server'
  count++
}
```

The custom plugin claims `G`, because `transformHoistInlineDirective` returns generated hoist names. The relevant generation and replacement occur in [`hoist.ts`](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/src/transforms/hoist.ts#L94-L137).

The built-in file-level pass then wraps all four exports:

```js
getCount = BUILTIN_REGISTER(getCount, 'getCount')
increment = BUILTIN_REGISTER(increment, 'increment')
reset = BUILTIN_REGISTER(reset, 'reset')
G = BUILTIN_REGISTER(G, 'G')
```

Its claim contains `getCount`, `increment`, `reset`, and `G`. Aggregation detects that `G` is already owned by the custom plugin and throws the explicit duplicate-owner error implemented in [`server-reference.ts`](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/src/plugins/server-reference.ts#L112-L118).

This is the earliest hard failure. Relaxing the collision would not make the output correct because the built-in pass would still register the custom wrapper and generated implementation as built-in references.

## Built-in Then Custom

Reversing plugin order lets the built-in pass claim only the original source exports, but it appends assignments such as:

```js
increment = BUILTIN_REGISTER(increment, 'increment')
export { increment }
```

The later custom hoister preserves the inline directive but replaces the original function declaration with:

```js
const increment = CUSTOM_REGISTER(G)
```

The resulting module parses but fails when it evaluates the built-in assignment to `const increment`. `transformWrapExport`'s generated assignment contract is visible in [`wrap-export.ts`](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/src/transforms/wrap-export.ts#L64-L98), while the hoister's `const` replacement is generated in [`hoist.ts`](https://github.com/vitejs/vite-plugin-react/blob/31cdbb82219b6b637eee338a3492f735c78116bf/packages/plugin-rsc/src/transforms/hoist.ts#L113-L130).

The reverse order also cannot provide the desired client and SSR behavior. The built-in proxy transform sees a module-level `"use server"` file and removes the function bodies before the custom plugin can classify `increment` as custom-owned. The browser therefore receives a built-in proxy for every source export.

## Ownership Matrix

| Export        | Source role                            | Desired owner | Custom-first result                               | Built-in-first result                                                                    |
| ------------- | -------------------------------------- | ------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `getCount`    | Inherited `"use server"`               | Built-in      | Built-in                                          | Built-in                                                                                 |
| `increment`   | Inline custom override                 | Custom        | Wrapped by custom, then re-registered by built-in | Custom wrapper generated, then assigned by built-in through invalid `const` reassignment |
| `reset`       | Inherited `"use server"`               | Built-in      | Built-in                                          | Built-in                                                                                 |
| Generated `G` | Custom implementation/reference helper | Custom only   | Claimed by both owners                            | Custom claim is disjoint, but source binding and proxy ownership are already wrong       |

## Why Claims Are Not A Transform-composition Protocol

The claim manager operates after each plugin has generated code and selected export names. It can:

- Preserve disjoint metadata from independent owners.
- Remove only one owner's stale claim during HMR.
- Reject incompatible module identity or duplicate export ownership.

It cannot:

- Tell the built-in syntax transform that one source export has an inline override.
- Prevent a later transform from wrapping an earlier transform's generated helper export.
- Select the correct client proxy ID for an overridden source export.
- Reconcile incompatible binding rewrites after code generation.

The duplicate-owner error is therefore useful evidence that syntax ownership was never coordinated, not a claim-manager limitation to relax.

## Recommendation

Use one role-aware traversal for modules where file-level defaults and inline Server Function directives may mix.

The traversal should:

1. Parse the module directive once.
2. Classify each function as an explicit inline role or an inherited module role.
3. Validate conflicting directives before code generation.
4. Assign one runtime owner and one reference identity to each callable.
5. Generate implementation wrappers and final exports from that classification.
6. Return disjoint claim sets for the built-in and custom owners.
7. Generate client and SSR proxies from the same role map.

Directive-specific semantics should remain external. A custom owner can provide matching, wrapping, capture encoding, and runtime expressions, while the shared traversal owns role precedence and export code generation. This is narrower than making `"use cache"` a built-in plugin-rsc directive.

A directive-neutral intermediate representation could implement the same architecture, but two complete source-to-source passes need such an ownership handoff before either emits code. Merely documenting plugin order is insufficient.

## Scope

This analysis does not evaluate cache storage, replay, invalidation, handler policy, PR #1246, or broader declaration syntax. Cross-environment cache transport is covered separately in [FINDINGS-CACHE-SERVER-REFERENCE-TRANSPORT.md](./FINDINGS-CACHE-SERVER-REFERENCE-TRANSPORT.md).

## Verification

The Next.js findings use committed transform fixtures at the pinned commit. The Vite findings use direct source inspection of the custom plugin, generic transforms, built-in plugin, claim aggregation, and the focused `custom-server-function` prototype source. No E2E result is used for the conclusion.
