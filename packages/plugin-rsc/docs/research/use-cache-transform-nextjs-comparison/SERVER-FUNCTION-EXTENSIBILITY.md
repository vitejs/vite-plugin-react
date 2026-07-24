# Userland Server-Function Extensibility

## Goal

Allow a framework-owned transform to make another directive produce React Server Functions without teaching `@vitejs/plugin-rsc` the directive's framework semantics.

The motivation comes from the semantics of Next.js `"use cache"`: selected framework-owned callables can participate in React Server Function transport. The plugin-rsc API should not recognize `"use cache"`, implement caching, or make the basic demo align with Next.js.

## Primary Direction

The primary plugin-rsc API problem is bundler-level Server Function extensibility. An independently transformed callable should be able to opt into React Server Function transport through:

- Normalized reference identity.
- Owner-aware metadata registration and cleanup.
- RSC registration and browser/SSR proxies.
- Protected bound arguments.
- Production manifest publication and development resolution.
- Stable composition with the built-in `"use server"` owner.

Its question is:

> How does an already transformed callable become a resolvable React Server Function?

This capability depends on plugin-rsc's environment graphs, normalized module identity, manifests, development loading, and metadata lifecycle. It cannot be reproduced cleanly as an isolated syntax transform. It should not prescribe how the callable was produced or require a directive at all.

## Current Built-In Boundary

`vitePluginUseServer` currently owns both syntax policy and the full server-reference lifecycle in [packages/plugin-rsc/src/plugin.ts:1987](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/src/plugin.ts#L1987):

- Detect the literal `"use server"` directive.
- Expand module-level `export *` declarations.
- Normalize module identity for development and production.
- Transform RSC implementations and register their exports.
- Encrypt and decrypt inline closure captures.
- Generate browser and SSR proxies for module-level directives.
- Publish exports through `RscPluginManager.serverReferenceMetaMap`.
- Remove stale metadata when directives disappear.
- Generate the production server-reference loader manifest.

Several transform helpers are already public through `@vitejs/plugin-rsc/transforms`, but identity normalization and lifecycle ownership remain private to `vitePluginUseServer`.

## Semantic Requirement

Next.js-compatible cached functions need React Server Function protocol semantics when they cross into Client Components. They do not need the literal `"use server"` directive or the built-in `vitePluginUseServer` transform.

The protocol-level requirements are:

- A stable reference key and exported name.
- Registration of the callable that should execute remotely.
- Client and SSR proxies for directly imported module exports.
- Manifest and development-loader discoverability.
- Protected bound closure arguments for inline references.

Framework-specific cache behavior remains outside plugin-rsc:

- Choosing which directives imply remote callability.
- Wrapping the inner implementation with the cache runtime.
- Ensuring registration targets the cached wrapper rather than the raw function.
- Using parameter metadata to exclude framework-supplied action arguments from cache keys.
- Cache kind, lifetime, storage, and invalidation policy.

Cached Flight replay is also outside this requirement. Preserving opaque references while replaying a cached Flight stream is a separate runtime choice, not a prerequisite for implementing a userland cached Server Function directive.

## Core Implementation Change

The fundamental problem is that `serverReferenceMetaMap[id]` is treated as the output of one transform. In reality, server references for one module can be discovered by different producers and in different Vite environments. A transform that finds nothing currently deletes the entire module record, including references discovered elsewhere.

Replace the single record with reference claims keyed by module, producer, and environment. Each transform pass replaces only its own claim. The effective module metadata is the union of live claims.

The environment dimension is necessary even for built-in `"use server"`: an RSC pass can discover inline references while a client or SSR pass correctly finds no module-level proxy. The latter must not erase the former. A client-only import can conversely discover a module-level server export that was not already reached through the RSC graph.

The registry must also own canonical module identity. Development claims need the same RSC-environment Vite import URL, while production claims need the same root-relative hash. Claims for one module must agree on that identity; export names can be deduplicated, while conflicting producers for the same `referenceKey#exportName` should fail.

`vitePluginUseServer` can keep all literal `"use server"` detection and transformation logic. Its existing assignments and deletes become updates to the built-in producer's current-environment claim. Production manifest generation iterates aggregated claims, and development validation checks the same aggregate. No generic directive pipeline or transform-provider abstraction is required.

### Built-In `"use server"` On The New Foundation

The built-in plugin would create one stable owner and replace only that owner's claim for the environment currently being transformed:

```ts
const useServerOwner = manager.serverReferences.createOwner('rsc:use-server')

async function transform(code, id) {
  const module = manager.serverReferences.resolveModule(this, id)

  if (this.environment.name === rscEnvironmentName) {
    const result = transformServerActionServer(code, ast, {
      runtime: (value, name) =>
        registerServerReference(value, module.referenceKey, name),
      // existing encryption and validation options
    })

    useServerOwner.replace(this.environment.name, module, {
      exportNames: result ? getExportNames(result) : [],
    })

    return result?.output
  }

  const result = hasModuleDirective
    ? transformDirectiveProxyExport(ast, {
        runtime: (name) => createServerReference(module.referenceKey, name),
      })
    : undefined

  useServerOwner.replace(this.environment.name, module, {
    exportNames: result?.exportNames ?? [],
  })

  return result?.output
}
```

An empty client or SSR claim no longer removes inline references found by the RSC pass. A module-level export discovered from a client-only import can still contribute a claim even when the module was not previously reached through the RSC graph. A custom producer can contribute different exports for the same module without either producer restoring metadata after the other runs.

The aggregated entry remains the shape needed by existing consumers:

```ts
{
  importId: module.importId,
  referenceKey: module.referenceKey,
  exportNames: unionOfLiveClaims,
}
```

Thus the production manifest and development validation need only switch from reading the mutable map to reading aggregated entries; the actual `"use server"` source transform and runtime protocol remain intact.

## Smallest First-Class API

The initial public surface only needs to let a userland transform obtain canonical identity and replace its own claim:

```ts
const references = manager.serverReferences
const module = references.resolveModule(context, id)

references.replaceClaim(owner, context.environment.name, module, {
  exportNames,
})
```

Replacing a claim with no exports performs cleanup for that producer and environment without deleting other claims. Manifest generation and development validation remain internal consumers of the aggregated view. The exact names are illustrative and should follow the implementation rather than drive it.

## Optional Higher-Level Helper

Once the claim-based lifecycle works for built-in `"use server"` and the dedicated userland example, plugin-rsc can consider extracting a higher-level helper from `vitePluginUseServer`. That helper could reuse environment branching, registration and proxy generation, encryption wiring, runtime imports, and claim cleanup while leaving syntax detection and framework wrapping to userland.

Conceptually:

```ts
createServerFunctionPlugin({
  name,
  matches,
  transformServer,
  transformProxy,
})
```

This could become a plugin factory or equivalent registration facility, with built-in `"use server"` eventually using the same path. The exact shape should be derived from the working implementation and E2E rather than designed first. It remains a desirable endpoint because userland frameworks should not need to reproduce the stable Server Function lifecycle after the lower-level ownership problem is solved.

Per [plugin-rsc's testing guidance](https://github.com/vitejs/vite-plugin-react/blob/32611a28365435d81a513c559715411bdc8f127e/packages/plugin-rsc/CONTRIBUTING.md#end-to-end-tests), this feature should have its own runnable example with a thin development-and-production E2E demonstrating a simple userland-transformed cached callable crossing the Client Component boundary through the new registration API. Test the observable bundler behavior rather than reducing metadata ownership and proxy orchestration to surgical mocked tests; reserve unit tests for self-contained transform helpers.

## Secondary Transform Investigation

Separately, a Next.js-level cache runtime benefits from richer information at the transform boundary. This work is lower-level and can live entirely in userland; it is not a prerequisite for the first-class Server Function registration API.

The investigated transform payload is:

- `parameters: { count, hasRest }` for admitting the source function's positional invocation arguments into a cache key.
- `hasBoundArgs` for distinguishing protected closure captures from ordinary invocation arguments before entering a wrapper.
- Stable generated hoist names so unrelated source insertions do not unnecessarily change exported reference names.
- `exportWrappedHoist` so a remotely resolved export targets the framework wrapper rather than bypassing it for the raw implementation.
- Separate `moduleRuntime` and `inlineRuntime` hooks because module exports and closure-bearing inline functions require different wrapping positions.
- Export metadata, filtering, async validation, and custom directive matching for framework policy.

[vite-plugin-react PR #1246](https://github.com/vitejs/vite-plugin-react/pull/1246) packages these capabilities into the public transform helpers, including a generalized `transformServerActionServer`. Upstreaming them is a reuse and maintenance choice rather than a bundler architecture requirement. The detailed transform comparison remains in [FINDINGS.md](./FINDINGS.md).

## Recommended Work

The two layers can land and be evaluated independently, but the server-function layer is the more important plugin-rsc design work.

### Primary Plugin-rsc Work

1. Replace the single module metadata record with producer- and environment-scoped claims.
2. Move built-in `"use server"`, manifest generation, and development validation onto the aggregated view.
3. Add the dedicated example and E2E coverage described above.
4. Expose canonical identity and claim replacement to the example's userland transform.
5. Validate that the same primitive removes Vinext's metadata restoration and copied identity logic.
6. Derive a cleaner higher-level Server Function helper from the proven shared lifecycle.

### Optional Transform Tooling

1. Land the generalized transform primitives from #1246.
2. Validate their runtime-neutral contracts with focused transform fixtures.
3. Keep cache policy and server-reference registration outside these helpers.
4. Treat upstream ownership as optional because a framework can maintain equivalent transforms in userland.

This split solves the concrete ownership bug without making richer transforms imply transport or prematurely committing plugin-rsc to a broad custom-directive policy API.

## Non-Goals

- Hardcode `"use cache"` in plugin-rsc.
- Make the basic plugin-rsc cache demo match Next.js.
- Require every custom directive to become remotely callable.
- Treat cache replay as part of server-function registration.
- Expose the mutable metadata map as the long-term API.

## Reference Context

The API and E2E target above stand on their own. The following projects explain the original semantic motivation and demonstrate downstream demand, but they should not determine the plugin-rsc API shape.

### Next.js `"use cache"`

Next.js provides the source behavior: selected cached callables can be imported into Client Components or passed across the RSC boundary and invoked through Server Function transport. That establishes the motivating capability without requiring plugin-rsc to implement Next.js cache policy.

### Earlier In-Core Proposal In PR #1246

[vite-plugin-react PR #1246](https://github.com/vitejs/vite-plugin-react/pull/1246) originally included an in-core `vitePluginServerFunctionDirectives` implementation. The preserved commit [`142fb07`](https://github.com/vitejs/vite-plugin-react/commit/142fb07353d2b167559aaa99b49a953951d98d9e) is titled `feat(rsc): support custom server function directives`.

In [the PR discussion](https://github.com/vitejs/vite-plugin-react/pull/1246#issuecomment-4686411317), James explained that the generic plugin started from the built-in `"use server"` behavior and that `"use server"` itself could eventually be routed through the same mechanism. He did not make that conversion in the initial proposal because it seemed risky before proving the generalized path.

The PR was later narrowed by commit [`5a2fd75`](https://github.com/vitejs/vite-plugin-react/commit/5a2fd7519fa6cce09af04b8b5288ecb8d4a2ddc3), `refactor(rsc): keep custom directives external`, leaving only the low-level transform improvements. This history is the direct upstream precedent for reconsidering a first-class Server Function registration API, while the current proposal can start below the earlier directive-specific plugin abstraction.

### Vinext PR #2156

[Vinext PR #2156](https://github.com/cloudflare/vinext/pull/2156) is downstream evidence that the composition need is real. It directly consumes the #1246 transform API, but it does not patch `rsc:use-server` or route `"use cache"` through the literal built-in transform.

Instead, Vinext installs two independent plugins around the built-in plugin:

```text
vinext:server-function-directives
rsc:use-server
vinext:server-function-directive-metadata
```

Vinext currently reproduces normalized-ID logic, runtime selection, proxy generation, encryption wiring, metadata ownership, cleanup, and merging. Its second plugin restores Vinext-owned metadata after `rsc:use-server` deletes or replaces the single `serverReferenceMetaMap` record.

This implementation demonstrates that a userland transform can produce the right Server Function semantics. It also provides a downstream validation target after the first-class registry API and plugin-rsc-owned E2E coverage exist.
