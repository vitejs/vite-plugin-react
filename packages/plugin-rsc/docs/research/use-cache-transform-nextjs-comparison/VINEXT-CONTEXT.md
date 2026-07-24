# Vinext `use cache` Server-Function Context

- Repo: git@github.com:vitejs/vite-plugin-react.git
- Commit: 32611a28365435d81a513c559715411bdc8f127e
- Branch: main
- Reviewed: 2026-07-23
- Vinext PR #1871 head: 9f4b6ee48a36c538deb0140d5aef818265a2d13a
- Vinext PR #2156 head: 622f0b915156fbfcb03ca4f1596cc0d0f6725ebe
- Plugin-rsc PR #1246 head: 5a2fd7519fa6cce09af04b8b5288ecb8d4a2ddc3
- Plugin-rsc PR #1289 merge: a3690f37480b43d63366272b57f9bac0d2377c3b

## Purpose

This note records the higher-level context from:

- [cloudflare/vinext#1871](https://github.com/cloudflare/vinext/pull/1871)
- [cloudflare/vinext#2156](https://github.com/cloudflare/vinext/pull/2156)
- [vitejs/vite-plugin-react#1246](https://github.com/vitejs/vite-plugin-react/pull/1246)
- [vitejs/vite-plugin-react#1289](https://github.com/vitejs/vite-plugin-react/pull/1289)

It refines the scope of [FINDINGS.md](./FINDINGS.md). The central distinction is between a server-local cache directive and a custom directive that a framework elects to expose through the complete RSC server-function lifecycle.

## Bottom Line

Vinext is not demonstrating that caching inherently requires server-reference semantics or that the generic hoister cannot implement server-local `"use cache"` behavior.

Vinext is pursuing compatibility with an observed Next.js model that can be summarized as: `"use cache"` implicitly also has `"use server"` transport semantics. The function remains cache-wrapped, but it is additionally registered and transported as a server function, so a nested cached function can be passed to a Client Component and invoked through the server-function protocol. Plugin-rsc currently treats only the explicit `"use server"` directive as opting into that protocol. Its surrounding orchestration was not designed to let another directive imply the same transport role.

The resulting gap is primarily an assumption and public-composition gap:

- Generic transforms can discover, hoist, capture, and wrap custom directives.
- Built-in reference registration, normalized IDs, client/SSR proxies, encryption, manifest metadata, and metadata cleanup are specialized around `"use server"`.
- A framework that wants another directive to imply `"use server"` transport must reproduce or hook into that orchestration.

This does not imply plugin-rsc should adopt Next.js's implicit rule for `"use cache"`. The more general question is how a framework can declare that one of its custom directives also implies server-function transport.

## Next.js Behavior, Intent, And Documentation

Next.js currently compiles cache functions through its shared server-actions transform and registers generated cache wrappers as server references. In implementation terms, `"use cache"` is effectively `"use cache"` plus implicit `"use server"` transport.

This behavior is covered by more than the dedicated nested-function fixture:

- The broad `use-cache` E2E suite imports exports from a module-level `"use cache"` file defined in [test/e2e/app-dir/use-cache/app/(partially-static)/imported-from-client/cached.ts:1](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/test/e2e/app-dir/use-cache/app/%28partially-static%29/imported-from-client/cached.ts#L1) directly into the Client Component in [test/e2e/app-dir/use-cache/app/(partially-static)/imported-from-client/client-component.tsx:1](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/test/e2e/app-dir/use-cache/app/%28partially-static%29/imported-from-client/client-component.tsx#L1). The shared client form invokes those functions through `useActionState` in [test/e2e/app-dir/use-cache/app/form.tsx:14](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/test/e2e/app-dir/use-cache/app/form.tsx#L14), and the spec verifies cache hits in [test/e2e/app-dir/use-cache/use-cache.test.ts:192](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/test/e2e/app-dir/use-cache/use-cache.test.ts#L192).
- The same suite creates named, anonymous, and arrow inline `"use cache"` functions and passes them to a Client Component in [test/e2e/app-dir/use-cache/app/(partially-static)/passed-to-client/page.tsx:9](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/test/e2e/app-dir/use-cache/app/%28partially-static%29/passed-to-client/page.tsx#L9). The same [client form invocation](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/test/e2e/app-dir/use-cache/app/form.tsx#L14) calls them, and the spec verifies cache hits in [test/e2e/app-dir/use-cache/use-cache.test.ts:216](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/test/e2e/app-dir/use-cache/use-cache.test.ts#L216).
- The dedicated fixture defines a cached component containing nested inline cached functions and passes them as props in [test/e2e/app-dir/use-cache-with-server-function-props/app/nested-cache/page.tsx:16](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/test/e2e/app-dir/use-cache-with-server-function-props/app/nested-cache/page.tsx#L16). Its [Client Component boundary](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/test/e2e/app-dir/use-cache-with-server-function-props/app/nested-cache/form.tsx#L1) invokes those props through `useActionState` in [form.tsx:12](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/test/e2e/app-dir/use-cache-with-server-function-props/app/nested-cache/form.tsx#L12), and the spec asserts the browser round trip in [test/e2e/app-dir/use-cache-with-server-function-props/use-cache-with-server-function-props.test.ts:26](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/test/e2e/app-dir/use-cache-with-server-function-props/use-cache-with-server-function-props.test.ts#L26).
- Compiler fixtures separately pin the rule. A module-level cache input in [crates/next-custom-transforms/tests/fixture/server-actions/client-graph/6/input.js:1](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/client-graph/6/input.js#L1) becomes client `createServerReference` proxies in [client-graph/6/output.js:1](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/client-graph/6/output.js#L1). An inline cache function in [server-graph/33/input.js:1](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/33/input.js#L1) becomes a registered cache wrapper in [server-graph/33/output.js:5](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/33/output.js#L5).

This establishes maintained implementation behavior across multiple source forms rather than behavior inferred from one isolated edge-case test. It does not establish server-function semantics as the product-level definition of `"use cache"`. The PR history instead shows that particular consequences of the shared implementation have been added or preserved intentionally:

- [Next.js PR #71401](https://github.com/vercel/next.js/pull/71401), merged October 17, 2024, explicitly fixed cached functions so they could be imported and called from Client Components.
- [Next.js PR #72506](https://github.com/vercel/next.js/pull/72506), merged November 12, 2024, optimized cache-key argument admission specifically so a cached getter could be used with `useActionState` without React's action arguments causing cache misses.
- [Next.js PR #72969](https://github.com/vercel/next.js/pull/72969), merged November 20, 2024, described a grouped `api.product.fetch()` cached method as a realistic use case and called both `"use server"` and `"use cache"` forms server functions.
- [Next.js PR #81431](https://github.com/vercel/next.js/pull/81431), merged July 9, 2025, deliberately preserved nested cached functions passed to Client Components as server references even when their enclosing cached component is restored from a partial-static cache.
- [Next.js PR #94301](https://github.com/vercel/next.js/pull/94301), merged June 2, 2026, documented direct client calls to cached exports while deliberately limiting how the capability is presented.

There is explicit documentation for part of this model. The `"Caching function output with use cache"` section presents network requests, database queries, and slow computations as intended cached functions in [docs/01-app/03-api-reference/01-directives/use-cache.mdx:436](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/docs/01-app/03-api-reference/01-directives/use-cache.mdx#L436). It then states that exports from a file carrying a cached directive can be imported into a Client Component and called directly, where they run on the server similarly to a Server Function, in [use-cache.mdx:458](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/docs/01-app/03-api-reference/01-directives/use-cache.mdx#L458).

The implementation and public framing therefore point in different directions. Compiler and E2E tests show broad reuse of server-function machinery: file-level cached exports can become client-importable proxies, while inline and nested cached functions can become registered references passed to Client Components. The file-level condition in the documentation limits the direct-import example, not the underlying transport mechanism.

However, [Next.js PR #94301](https://github.com/vercel/next.js/pull/94301) explicitly says, “Rather than introducing this as a pattern now, let's start with a callout.” The resulting documentation presents direct client calls as a “Good to know” capability and recommends calling cached functions on the server instead.

The best-supported reading is that reusing server-function machinery is an implementation technique rather than a product-level definition of `"use cache"`. Individual consequences of that technique are now intentional, tested, and documented, but Next.js deliberately does not present `"use cache"` as a general `"use server"` primitive or recommended client-call pattern.

Vinext is therefore targeting broader observed Next.js behavior, not simply implementing a publicly stated rule that every `"use cache"` function is a server function. This behavior also does not prove that every framework's `"use cache"` implementation requires server-reference semantics.

## Two Semantic Models

| Model                                | Server-local cache directive                   | Cache directive with implicit `"use server"` transport           |
| ------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------- |
| Execution                            | Called only while evaluating server code       | May also be invoked through an RSC action request                |
| Crosses Flight as callable reference | No                                             | Yes                                                              |
| Generic hoist and runtime wrapper    | Sufficient for the demonstrated core behavior  | Necessary but insufficient by itself                             |
| Registered server reference          | Not required                                   | Required                                                         |
| Client and SSR proxy                 | Not required                                   | Required for module-level imports                                |
| Production manifest entry            | Not required                                   | Required to resolve action requests                              |
| Protected bound captures             | Runtime choice                                 | Required by the selected server-function protocol/security model |
| Stable reference naming              | Only needed according to cache lifetime policy | Needed according to reference and HMR lifecycle                  |

The minimal plugin-rsc demo implements the first model. Vinext PRs #1871 and #2156 target the second model for Next.js compatibility.

## Vinext Transform Evolution

There are three useful snapshots of the Vinext approach.

### 1. Before The PRs: Server-Local Wrapper Plugin

Vinext main has a framework-owned `vinext:use-cache` Vite plugin. It detects module-level and inline cache directives and composes plugin-rsc's exported low-level transforms:

- Module-level `"use cache"` uses `transformWrapExport` to wrap selected exports.
- Inline `"use cache"` uses `transformHoistInlineDirective` to hoist closures and wrap the hoisted implementation.
- The supplied runtime expression calls Vinext's `registerCachedFunction(value, id, variant, options)`.
- The cache runtime owns key construction, storage, cache policy, argument/result Flight serialization, and replay.

Normalized module-level output:

```js
export async function getData(arg) {
  return value(arg)
}

getData = registerCachedFunction(getData, moduleId + ':getData', cacheKind)
```

Normalized inline output:

```js
function outer(capture) {
  const getData = registerCachedFunction(H, moduleId + ':H', cacheKind).bind(
    null,
    capture,
  )
  return getData
}

async function H(capture, arg) {
  return value(capture, arg)
}
```

This approach is fundamentally server-local. The wrapped function is useful while evaluating server code, but the transform does not make custom cached callables participate in plugin-rsc's complete server-reference lifecycle. It does not inherently create client/SSR proxies, normalized plugin-rsc reference IDs, production manifest entries, or a manifest-addressable wrapped-hoist export.

This is the same general composition pattern as the minimal demo, with a much richer framework cache runtime and additional Next.js-specific handling.

### 2. PR #1871: Promote Cached Callables To Server References

PR #1871 began as a fix for the nested cached-function prop fixture and evolved through several approaches:

- Register the wrapped cached callable with `registerServerReference` at the inline call site.
- Replace raw file paths with plugin-rsc-compatible normalized reference keys.
- Write hoisted exports into `serverReferenceMetaMap` so production action requests can resolve them.
- Run metadata restoration after `rsc:use-server` because the built-in plugin could clear custom entries.
- Export or reassign the wrapped cached callable so manifest resolution invokes the cache wrapper rather than the raw hoisted implementation.
- Encrypt closure-bound arguments before exposing the callable as a server reference.

These fixes progressively reproduced pieces of plugin-rsc's built-in `"use server"` orchestration.

The later PR #1871 form then moved toward the proposed in-core `serverFunctionDirectives` option from the earlier version of plugin-rsc PR #1246. Vinext would provide the directive match, validation, cache runtime, wrapper expression, and export filtering, while plugin-rsc would own hoisting, registration, proxies, normalized IDs, encryption, and manifest metadata.

Normalized configuration intent:

```js
rsc({
  serverFunctionDirectives: [
    {
      directive: /^use cache.*$/,
      wrap: ({ value, id, name, directiveMatch, parameters, runtime }) =>
        `${runtime}.registerCachedFunction(${value}, ${id + ':' + name}, ${kind}, ${parameters})`,
    },
  ],
})
```

That design let a custom directive opt into implicit `"use server"` transport through plugin-rsc, but it also placed generic directive orchestration inside plugin-rsc.

### 3. PR #2156: Userland Server-Function Directive Orchestration

Plugin-rsc PR #1246 was subsequently narrowed to low-level transform improvements and no longer proposes an in-core `serverFunctionDirectives` option. PR #2156 adapts Vinext to that direction.

Vinext now owns a generic server-function-directive implementation in userland while consuming plugin-rsc primitives. It installs two plugins around the built-in `rsc:use-server` plugin:

```text
vinext:server-function-directives
  -> rsc:use-server
  -> vinext:server-function-directive-metadata
```

The first plugin runs while the original module shape is intact and performs environment-specific transforms:

- In the RSC environment, it uses `transformServerActionServer` with custom module and inline runtimes.
- For inline cache functions, it asks the transform for stable names and exported wrapped hoists.
- It uses parameter metadata to configure cache-key argument admission.
- It uses `hasBoundArgs` to insert a decrypting adapter before the cached wrapper.
- It registers the resulting wrapper as a server reference with plugin-rsc-compatible normalized identity.
- In client and SSR environments, it emits proxies for module-level cached exports.

The second plugin restores Vinext-owned metadata after `rsc:use-server` has performed its own cleanup or rewriting. Vinext tracks ownership so stale proxy transforms do not resurrect references after a directive is removed.

The cache-specific wrapper remains framework-owned:

```js
registerCachedFunction(inner, frameworkCacheId, cacheKind, {
  parameters,
})
```

The server-function lifecycle around that wrapper is now also Vinext-owned, but composed from plugin-rsc's public manager and low-level transforms rather than maintained as ad hoc cache-only patches.

### Summary Of The Change

| Stage                  | Cache transform ownership                                          | Server-function lifecycle ownership                                             | Resulting model                                                                        |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Vinext main before PRs | Vinext plugin using plugin-rsc hoist/wrap utilities                | Only built-in `"use server"` lifecycle exists                                   | Server-local cached functions                                                          |
| PR #1871 intermediate  | Vinext cache plugin, then proposed plugin-rsc directive definition | Initially patched in Vinext; later delegated to proposed in-core plugin-rsc API | Cached functions promoted to server references                                         |
| PR #2156 latest        | Vinext generic directive plugin using richer plugin-rsc primitives | Vinext plugins own registration, proxies, metadata, and ordering                | A custom directive can imply `"use server"` transport without an in-core directive API |

The cache runtime itself is not replaced by these PRs. The main transformation is that selected cached callables gain a second role as first-class RSC server functions.

See [SERVER-FUNCTION-EXTENSIBILITY.md](./SERVER-FUNCTION-EXTENSIBILITY.md) for the focused implementation analysis and proposed plugin-rsc composition API.

## Vinext's Failing Behavior

The motivating Next.js fixture defines inline cached functions inside a cached component, passes them as props to a Client Component, and invokes them with `useActionState`.

That requires an end-to-end chain:

1. The inline directive transform hoists and wraps the function.
2. The wrapped cached callable becomes the server-reference target.
3. Flight serializes the callable as an opaque server reference.
4. The reference ID resolves through plugin-rsc's production manifest or development import path.
5. Bound closure captures survive the reference protocol.
6. The action request invokes the cached wrapper rather than bypassing it and calling the raw implementation.

The old Vinext transform could perform step 1 but did not own the rest of the chain reliably.

## Why The Existing Hoist Output Was Insufficient

The current generic hoister exports the raw hoisted implementation while the wrapped callable remains at the original declaration site. That is appropriate for the built-in server-local demo.

When `"use cache"` also implies `"use server"` transport, the manifest-addressable export must represent the wrapped callable. Otherwise an action request can resolve the raw implementation and bypass caching. Vinext's PR history explicitly moved from inline registration and later reassignment toward exporting the wrapped hoist itself.

This makes the wrapper-placement distinction from [FINDINGS.md](./FINDINGS.md) materially important only after adopting the implicit-`"use server"` model. It was correctly not a demonstrated limitation for the server-local demo.

## Required Information And Lifecycle

Vinext's implementation identifies two categories of missing support.

### Transform Information

- `parameters: { count, hasRest }` so the cache runtime can admit the same positional argument prefix as the transformed function.
- `hasBoundArgs` so the integration knows whether the first bound slot is a protected capture payload that must be decoded before entering the cache wrapper.
- Stable generated hoist names so unrelated source insertions do not unnecessarily change reference names.
- An `exportWrappedHoist` form so the exported reference target is the cache wrapper rather than the raw implementation.
- Richer export metadata for module-level directive forms.

These proposed primitives appear in plugin-rsc PR #1246. They directly corroborate the argument-admission and capture-boundary findings in [FINDINGS.md](./FINDINGS.md).

### Plugin Orchestration

- Generate reference IDs using plugin-rsc's normalized module identity.
- Register transformed exports in `RscPluginManager.serverReferenceMetaMap`.
- Produce client and SSR proxies for module-level directive exports.
- Preserve metadata owned by the RSC transform across non-owning SSR/client passes.
- Remove stale owned metadata when a directive disappears during HMR.
- Compose correctly around the built-in `rsc:use-server` transform, which has its own metadata cleanup and rewriting behavior.

This orchestration is not a property of function hoisting. PR #2156 implements it as Vinext-owned plugins before and after `rsc:use-server`, using plugin-rsc's public manager and low-level transforms.

## Relation To Existing Research

The Vinext context generally matches the first-pass findings, with one important scope activation.

### Confirmed Findings

- Parameter admission is a real transform-output requirement. Vinext passes parameter shape into `registerCachedFunction` and slices cache-key arguments accordingly.
- Capture packaging alone is insufficient when the outer runtime must decode captures before keying. Vinext uses `hasBoundArgs` to emit a decrypting adapter around the cached wrapper.
- Wrapper creation at the original nested site is acceptable for server-local caching but not enough when the wrapped callable must also be the exported server-reference target.
- Function-object identity is sufficient for the in-memory demo, while reference naming and normalized module identity become relevant when the custom directive also implies `"use server"` transport.

### Newly Activated Follow-Up

The previously deferred cross-environment server-reference track is now the most relevant next investigation because it is the actual subject of Vinext's reported gap.

This does not invalidate the first-pass conclusion. It introduces a second semantic model with additional requirements.

## Cache Replay Is Separate

See [VINEXT-SERVER-REFERENCE-PRESERVATION.md](./VINEXT-SERVER-REFERENCE-PRESERVATION.md) for the detailed history and comparison with Next.js. In particular, Vinext's current use of #1289 should not be treated as evidence that opaque preservation is required for compatibility.

Plugin-rsc PR #1289 adds opt-in `preserveServerReferences` behavior when decoding cached Flight. This allows a replaying RSC runtime to preserve an opaque reference without importing its implementation.

Vinext PR #2156 currently calls this API in its Flight replay path, but #1289 is not required to implement its userland `"use cache"` transform or Server Function registration. Removing or replacing that replay strategy would not change the transform. Next.js instead supplies a `serverModuleMap` during cache replay and resolves the referenced implementation. A plugin-rsc framework could choose the same strategy.

The concerns should remain separate:

- Transform and orchestration create a valid, resolvable server reference.
- Cache replay must either resolve that reference, as Next.js does, or optionally preserve it opaquely using #1289.

## Next Research Direction

The next research should ask:

> If a framework declares that a custom directive also implies `"use server"` transport, what minimal plugin-rsc primitives let it compose that server-function lifecycle?

It should not assume:

> `"use cache"` inherently requires server-reference semantics.

The recommended investigation is:

1. Trace the Vinext nested cached-function fixture from source transform through browser action invocation.
2. Prove where exporting the raw implementation fails and where exporting the wrapped hoist fixes resolution and cached-invocation semantics.
3. Map `parameters`, `hasBoundArgs`, stable names, normalized IDs, and manifest exports to their exact consumers.
4. Separate low-level transform primitives from cross-environment plugin orchestration.
5. Evaluate whether plugin-rsc's public manager plus low-level transforms are an adequate composition surface, or whether a narrower reference-lifecycle helper is justified.
6. Treat replay as a separate runtime track. Vinext currently chooses the already merged #1289 preservation behavior, but reference resolution is also valid.

## Next Step For Plugin-rsc Discussion

The next step for the plugin-rsc author is a focused discussion with Vinext that separates Vinext's compatibility motivation from plugin-rsc API design.

### 1. Establish Why Vinext Needs This Behavior

Ask how much of Next.js's `"use cache"` server-function transport Vinext treats as required compatibility:

- The documented module-level capability for Client Components to call cached exports.
- An intentional extension of that capability to every inline and nested cached function.
- Behavior required by applications encountered in the wild.
- Primarily part of Vinext's Next.js compatibility-percentage goal.

The documentation explicitly supports direct client calls to module-level cached exports and frames cached functions as useful for database queries, network reads, and slow computations. The PR history shows that direct imports, `useActionState`, and nested references were deliberate compatibility targets. It also shows that Next.js does not yet want to introduce client invocation as a recommended data-fetching pattern.

Next.js's intent does not determine whether Vinext should support the behavior. Vinext's motivation does affect how strongly plugin-rsc should treat it as a general framework requirement rather than a compatibility target.

### 2. Discuss Composable Server-function Semantics Independently

Regardless of what Next.js intends for `"use cache"`, plugin-rsc's server-function machinery may be too tightly coupled to the literal `"use server"` directive.

The general design question is:

> Can plugin-rsc's server-function lifecycle be composed by another opt-in directive without duplicating the built-in plugin's normalized IDs, proxies, protected bound arguments, manifest registration, and metadata lifecycle?

The desired boundary should preserve these constraints:

- `"use server"` remains the only built-in directive with server-function meaning.
- Custom directives remain server-local by default.
- A framework can explicitly declare that a custom directive also implies `"use server"` transport.
- The reusable API does not encode Next.js `"use cache"` policy.
- Low-level syntax transforms remain separable from cross-environment reference orchestration.

### 3. Ask Vinext For The Minimum Missing Surface

PR #2156 demonstrates that external orchestration is feasible, but it also reproduces substantial lifecycle code. Ask Vinext to classify that code into:

- Essential server-reference lifecycle logic that any custom server-function directive would need.
- Vinext-specific cache wrapping and Next.js compatibility policy.
- Temporary workarounds for current plugin ordering or metadata ownership.
- Utilities that could remain framework-local if plugin-rsc documented stable composition points.

This should reveal whether plugin-rsc needs only the low-level transform improvements in PR #1246, a few narrower lifecycle helpers, or a generic opt-in server-function directive facility.

### Suggested Discussion Framing

> I see two separate motivations. First, Next.js documents direct Client Component calls to module-level cached exports and tests the same transport for inline and nested cached functions. I would like to understand whether Vinext needs the full general rule because of real application usage, deliberate Next.js compatibility, or both. Second, independently of that answer, plugin-rsc's `"use server"` machinery may be too syntax-specific. It would be useful to identify the minimum reusable server-reference lifecycle primitives that let a framework declare that another directive also implies `"use server"` transport, without making that the default for custom directives.

Do not begin the discussion from the premise that `"use cache"` should become a built-in plugin-rsc server-function directive. Begin from the narrower composability question and use the Vinext case as one concrete consumer.

## Open Design Question

The primary design decision is not whether plugin-rsc should recognize `"use cache"`. It is where optional custom server-function orchestration should live:

- Entirely in framework integration code, using exported low-level transforms and manager access.
- In a small plugin-rsc helper that handles normalized IDs, reference metadata, proxies, and lifecycle without prescribing directive runtime behavior.
- In a generic in-core custom-directive plugin, provided it remains opt-in and does not make server-reference semantics mandatory for server-local directives.

PR #1246 currently favors improved low-level primitives with framework-owned orchestration. PR #2156 demonstrates that this direction is feasible, although it requires substantial lifecycle code in Vinext.

## Scope Guard

Do not use Vinext's compatibility target as evidence that the minimal demo is incorrect. Treat server-reference transport as an intentional Next.js semantic, but do not generalize it into a universal requirement for every framework's `"use cache"` implementation. Keep transform metadata, reference orchestration, and Flight replay as three distinct layers.
