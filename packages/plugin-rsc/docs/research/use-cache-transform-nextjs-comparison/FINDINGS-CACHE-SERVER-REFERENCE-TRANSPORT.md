# `use cache` Server-Reference Transport Findings

- Vite/plugin-rsc worktree commit: `6f2975a0c428e235030a7988d3d1879115d734c3`
- Transform ABI under review: [vitejs/vite-plugin-react PR #1246](https://github.com/vitejs/vite-plugin-react/pull/1246), commit `50eaf476c117db9415c9d24725d420336b789f19`
- Next.js commit: `153bf8ac5fa00888ef5fbb2b65cac12f0942a44f`

## Executive Findings

Next.js transports cached functions as ordinary React server references whose registered target is the cache wrapper, not the unwrapped implementation. The same generated ID identifies the exported server reference, selects the cache entry namespace, protects an inline closure's bound captures, creates the client proxy, and resolves the production server module. A module-level cached export has no bound payload. An inline cached closure first creates and registers one module-level cache wrapper, then binds one encrypted capture payload to that registered wrapper. React's server-reference-aware `.bind()` preserves the wrapper's ID and records the payload as reference metadata for Flight ([module cache output](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/35/output.js#L4-L14), [inline cache output](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/58/output.js#L5-L20), [React registration and bind implementation](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-server.node.production.js#L127-L144)).

The Vite direction can use the same normalized shape without copying Next.js's monolithic transform. PR #1246 supplies the transform-side ABI that the earlier generic hoister lacked: stable generated names, a separately exportable wrapped hoist, a runtime-visible `hasBoundArgs` flag, and source-parameter `{ count, hasRest }` metadata ([hoist options and metadata](https://github.com/vitejs/vite-plugin-react/blob/50eaf476c117db9415c9d24725d420336b789f19/packages/plugin-rsc/src/transforms/hoist.ts#L20-L40), [wrapper/export/bind generation](https://github.com/vitejs/vite-plugin-react/blob/50eaf476c117db9415c9d24725d420336b789f19/packages/plugin-rsc/src/transforms/hoist.ts#L158-L209), [module export parameter metadata](https://github.com/vitejs/vite-plugin-react/blob/50eaf476c117db9415c9d24725d420336b789f19/packages/plugin-rsc/src/transforms/wrap-export.ts#L69-L85)). Combined with plugin-rsc's existing public server-reference claims from PR #1310, these fields are sufficient for both target cases; no additional generic transform field is required for transport ([custom claim integration example](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/examples/custom-server-function/custom-server-function-plugin.ts#L18-L102), [claim manager](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/src/plugins/server-reference.ts#L23-L59)).

The important composition choice is to omit the hoister's `decode` hook for transported inline caches. Use only `encode` at the bind site, then let the generated cache wrapper remove and decrypt the protected first argument before computing the cache key and before spreading captures into the unwrapped implementation. Configuring `decode` would decrypt inside the implementation, which is too late for a cache wrapper that keys on capture values. Next.js follows the former order: its cache runtime shifts the encrypted argument, decrypts it, validates the array, prepends it to cache arguments, and only later invokes the inner implementation ([Next.js cache runtime](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/use-cache/use-cache-wrapper.ts#L1980-L2024)).

## Normalized Pipelines

### Next.js: Module-Level Cached Export

```text
source module with "use cache"
  -> transform assigns deterministic reference ID I
  -> inner implementation H(sourceArgs...)
  -> module-level W = React.cache(function (...) {
       return cache(kind, I, 0, H, admitted arguments)
     })
  -> registerServerReference(W, I, null)
  -> export W under the source export name
  -> action metadata maps I to the generated wrapper export

client graph
  -> createServerReference(I, callServer, ..., sourceExportName)

browser call
  -> encode invocation args and POST I
  -> server manifest maps I to worker/module
  -> import generated action entry and select export I
  -> invoke W(invocationArgs...)
  -> W invokes cache(kind, I, 0, H, admittedArgs)
```

The server output for a simple module-level export shows `H`, then the cache wrapper, then registration, then the public alias ([server fixture input](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/35/input.js#L1-L5), [server fixture output](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/35/output.js#L1-L14)). The client-layer transform replaces a whole `"use cache"` module with `createServerReference` exports carrying the same IDs ([client fixture input](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/client-graph/6/input.js#L1-L5), [client fixture output](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/client-graph/6/output.js#L1-L5)).

In development, webpack keeps the transform-produced client proxy module to preserve source maps; in production it rewrites the action metadata to per-export virtual proxy modules for tree shaking ([client module loader](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/build/webpack/loaders/next-flight-client-module-loader.ts#L24-L45), [production proxy loader](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/build/webpack/loaders/next-flight-server-reference-proxy-loader.ts#L3-L24)). The build plugin emits a server-reference manifest mapping each ID to worker module IDs and includes the encryption key ([manifest construction](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/build/webpack/plugins/flight-client-entry-plugin.ts#L1101-L1180)). The action handler resolves the request ID through that map, imports the action entry, selects the ID-named export, and invokes it with Flight-decoded arguments ([request decode](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/action-handler.ts#L1049-L1077), [module load and invocation](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/action-handler.ts#L1095-L1148)).

### Next.js: Inline Cached Closure Passed Through Flight

```text
source inline cache closes over captures C
  -> deterministic reference ID I
  -> inner H([captures...], sourceArgs...)
  -> module-level W = React.cache(function (...) {
       return cache(kind, I, 1, H, admitted arguments)
     })
  -> registerServerReference(W, I, null)
  -> export W under generated name G; metadata maps I -> G

original closure site
  -> P = encryptActionBoundArgs(I, captures...)
  -> B = W.bind(null, P)
  -> React bind preserves I and records [P] as B.$$bound

Flight render
  -> serialize B as server reference I plus bound payload P
  -> browser revives callable proxy with the same bound payload

browser call
  -> POST I with bound payload P plus invocation args
  -> resolve generated export G
  -> W(P, invocationArgs...)
  -> decrypt P to captures[]
  -> cache key uses I, captures[], and admitted invocation args
  -> H(captures[], invocationArgs...)
```

Fixture 58 demonstrates the exact generated order: the inner function, exported cache wrapper, registration, and only then the nested `.bind(null, encryptActionBoundArgs(...))` expression ([input](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/58/input.js#L1-L10), [output](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/58/output.js#L1-L20)). The transform's binding helper explicitly generates `registeredIdent.bind(null, encryptActionBoundArgs(id, ...captures))` ([transform helper](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/src/transforms/server_actions.rs#L3195-L3227)). Next.js serializes the captures with Flight and encrypts `actionId + serializedArgs` with AES-GCM, so decryption is tied to the reference ID as well as the deployment key ([encryption](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/encryption.ts#L84-L108), [Flight serialization](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/encryption.ts#L155-L218)).

### Vite/plugin-rsc Direction

```text
RSC transform
  -> manager.serverReferences.resolve(moduleId, "rsc") gives module key K
  -> transform creates stable export name G
  -> cache identity/reference ID I = K + "#" + G
  -> inner implementation H
  -> module-level W = cacheWrapper(H, I, transform metadata)
  -> registerServerReference(W, K, G)
  -> export W as G
  -> claim module import ID, K, and G
  -> optional original-site W.bind(null, encrypt(captures[]))

client and SSR transforms for module-level "use cache"
  -> createServerReference(K + "#" + sourceExport, callServer, ...)
  -> claim the same module/export identity

development resolution
  -> validate K on demand against claims
  -> import K directly through the RSC environment

production resolution
  -> scan builds collect claims
  -> virtual:vite-rsc/server-references maps K to import(moduleId)
  -> loadServerAction(K + "#" + G) imports module and returns export G
```

plugin-rsc already assigns a dev key from Vite's normalized import-analysis URL and a production key from the project-relative module ID hash ([identity resolution](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/src/plugins/server-reference.ts#L29-L38)). Its built-in `"use server"` pipeline shows the environment split to reuse: server registration and encrypted closure binding in RSC, and client/SSR `createServerReference` proxies elsewhere ([RSC transform](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/src/plugin.ts#L2042-L2088), [proxy transform](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/src/plugin.ts#L2089-L2139)).

Development loading validates a reference key, transforms its target on demand if metadata has not yet been populated, and then imports the dev ID directly ([validation plugin](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/src/plugin.ts#L344-L390), [RSC loader](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/src/rsc/shared.ts#L5-L19)). Production uses scan builds before final RSC/client/SSR builds and generates a virtual key-to-dynamic-import map from aggregated claims ([build order](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/src/plugin.ts#L431-L471), [virtual production map](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/src/plugin.ts#L2144-L2163)). `loadServerAction` splits `K#G`, imports `K`, and selects `G`; the framework browser callback and RSC handler already encode arguments, send the ID, decode arguments, resolve the action, and invoke it ([loader](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/src/core/rsc.ts#L94-L98), [browser callback](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/examples/basic/src/framework/entry.browser.tsx#L49-L64), [RSC handler](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/examples/basic/src/framework/entry.rsc.tsx#L39-L59)).

## Focused Fixture Comparison

| Case                                                      | Next.js generated server shape                                                                                                                              | Vite composition required                                                                                                                                                                            | Transport result                                                                                                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module-level cached export imported by a Client Component | `H`; module-level `W = React.cache(() => cache(kind, I, 0, H, admittedArgs))`; register `W`; export `W`; client graph emits `createServerReference(I, ...)` | `transformWrapExport` runtime returns `registerServerReference(cacheWrapper(value, I, meta), K, exportName)`; non-RSC graphs use `transformDirectiveProxyExport`; both claim the export              | The client imports only a proxy. Calling it resolves and invokes the registered cache wrapper, never the raw implementation.                                    |
| Inline cached closure passed through Flight               | `H([captures], args)`; module-level exported and registered `W`; original site binds `encrypt(I, captures...)` to `W`                                       | `transformHoistInlineDirective({ stableName: true, exportWrappedHoist: true, encode, decode: undefined })`; runtime returns registered `cacheWrapper(implementation, I, meta)`; claim generated name | Flight sees a registered bound reference. The server resolver imports the exported wrapper, decrypts its first argument, and invokes `H(...captures, ...args)`. |

For module exports, PR #1246 reports exact direct-function parameter count/rest metadata and `undefined` when the signature is not statically known, which permits fixed-prefix admission or pass-all fallback ([parameter collection](https://github.com/vitejs/vite-plugin-react/blob/50eaf476c117db9415c9d24725d420336b789f19/packages/plugin-rsc/src/transforms/wrap-export.ts#L69-L85), [export metadata propagation](https://github.com/vitejs/vite-plugin-react/blob/50eaf476c117db9415c9d24725d420336b789f19/packages/plugin-rsc/src/transforms/wrap-export.ts#L150-L197)). For inline functions, it always reports source parameter count/rest plus whether a protected capture slot exists ([inline metadata generation](https://github.com/vitejs/vite-plugin-react/blob/50eaf476c117db9415c9d24725d420336b789f19/packages/plugin-rsc/src/transforms/hoist.ts#L187-L198)).

## Exact Wrapper, Registration, And Binding Order

The required Vite output is:

```js
async function H(captureA, captureB, arg) {
  return body(captureA, captureB, arg)
}

export const G = registerServerReference(
  cacheWrapper({
    id: K + '#' + G_NAME,
    implementation: H,
    hasBoundArgs: true,
    parameters: { count: 1, hasRest: false },
  }),
  K,
  G_NAME,
)

function outer(captureA, captureB) {
  return G.bind(null, encryptActionBoundArgs([captureA, captureB]))
}
```

On invocation, `cacheWrapper` must perform these steps in order:

1. Admit one protected slot plus the source positional prefix, or all arguments for a rest/unknown signature.
2. If `hasBoundArgs`, remove the first admitted value and decrypt it to `captures[]`.
3. Form cache arguments from `captures[]` and admitted invocation arguments.
4. On a miss, call `H(...captures, ...invocationArgs)`.

The registration call must wrap the cache wrapper, and `.bind()` must target the already registered result. Reversing the first order registers `H`, so Flight bypasses cache behavior. Binding before registration loses React's registered-reference-aware bind behavior at the point where the bound function is created. PR #1246's `exportWrappedHoist` emits the runtime result once at module scope and makes the original closure site refer to it before optional binding, which provides exactly this placement ([generated wrapped export and binding](https://github.com/vitejs/vite-plugin-react/blob/50eaf476c117db9415c9d24725d420336b789f19/packages/plugin-rsc/src/transforms/hoist.ts#L167-L209)). React registration replaces `.bind()` so the derived function retains `$$id` and accumulates `$$bound`, which is why registration must precede binding ([React implementation](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-server.node.production.js#L127-L144), [registration metadata](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-server.node.production.js#L3876-L3886)).

plugin-rsc's encryption runtime already Flight-serializes an arbitrary value, encrypts it with AES-GCM, and reverses those steps on decryption ([encryption runtime](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/src/utils/encryption-runtime.ts#L17-L37)). Unlike Next.js, this protocol does not include the server-reference ID in the encrypted plaintext. That is an existing plugin-rsc `"use server"` protocol difference, not a cache-transform ABI gap; a cache transport integration should reuse it unless plugin-rsc independently strengthens action encryption for all directives ([Vite encrypt call generation](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/src/plugin.ts#L2047-L2062), [Next.js ID-bound encryption](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/encryption.ts#L84-L95)).

## Responsibility Matrix

| Responsibility                                   | Transform                                                 | Cache integration/runtime                                 | Existing plugin-rsc orchestration                          |
| ------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| Find module and inline directives                | Yes                                                       | Select directive pattern/kind                             | No                                                         |
| Hoist unwrapped inline implementation            | Yes                                                       | No                                                        | No                                                         |
| Put reusable wrapper at module scope             | `exportWrappedHoist`                                      | Supply wrapper expression                                 | No                                                         |
| Deterministic inline export name                 | `stableName`                                              | Include name in cache identity                            | No                                                         |
| Module export name and known signature           | `transformWrapExport` metadata                            | Choose fixed-prefix or pass-all admission                 | No                                                         |
| Inline source signature                          | `{ count, hasRest }`                                      | Add one admitted prefix slot when `hasBoundArgs`          | No                                                         |
| Capture collection and one encoded bind value    | Capture analysis plus `encode` hook                       | Supply encryption expression                              | Encryption utility implementation                          |
| Decrypt before cache key and implementation call | Do not configure transform `decode`                       | Shift, decrypt, key, and spread                           | Encryption utility implementation                          |
| Cache wrapper and cache identity                 | No                                                        | Create wrapper; normally use `K#G` as ID                  | Supplies `K`                                               |
| `registerServerReference` placement              | Runtime callback is inserted by transform                 | Return `registerServerReference(cacheWrapper(...), K, G)` | React server runtime                                       |
| Client and SSR proxy generation                  | `transformDirectiveProxyExport` enumerates module exports | Select `"use cache"` module directive                     | Browser/SSR React client runtimes and `callServer`         |
| Reference ownership and collision checks         | Return transformed export names                           | Claim under plugin owner                                  | `ServerReferencesManager`                                  |
| Development resolution                           | No                                                        | No                                                        | Validation virtual module plus direct environment import   |
| Production module map                            | No                                                        | Claims must include wrapped generated exports             | Scan builds plus `virtual:vite-rsc/server-references`      |
| Request argument transport and action invocation | No                                                        | Cache wrapper consumes decoded call arguments             | Browser callback, Flight encode/decode, `loadServerAction` |

The split follows plugin-rsc's public custom server-function example, where an external plugin owns directive transforms while `ServerReferencesManager` owns shared identity and loading metadata ([example](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/examples/custom-server-function/custom-server-function-plugin.ts#L13-L16), [server and proxy claims](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/examples/custom-server-function/custom-server-function-plugin.ts#L38-L100)).

## PR #1246 Transform ABI Assessment

PR #1246 supplies the required transform ABI for the two transport cases when combined with the already merged PR #1310 claim API:

- `exportWrappedHoist` guarantees that the registered cache wrapper, rather than `H`, is the generated module export that production resolution can import.
- `stableName` gives an inline wrapper a deterministic export component `G`; plugin-rsc supplies the module component `K`.
- `hasBoundArgs` tells the runtime whether the first admitted argument is the protected capture payload.
- `{ count, hasRest }` lets the wrapper reproduce Next.js-style fixed-prefix versus pass-all admission. The total fixed prefix is `count + Number(hasBoundArgs)`.
- `directiveMatch` carries cache-kind syntax to the integration.
- `transformWrapExport` supplies corresponding signature metadata for statically known module exports and permits pass-all fallback for unknown signatures.

These fields are present directly in the PR's runtime callback contract and generated placement logic ([callback contract](https://github.com/vitejs/vite-plugin-react/blob/50eaf476c117db9415c9d24725d420336b789f19/packages/plugin-rsc/src/transforms/hoist.ts#L20-L40), [inline generation](https://github.com/vitejs/vite-plugin-react/blob/50eaf476c117db9415c9d24725d420336b789f19/packages/plugin-rsc/src/transforms/hoist.ts#L158-L209), [module metadata contract](https://github.com/vitejs/vite-plugin-react/blob/50eaf476c117db9415c9d24725d420336b789f19/packages/plugin-rsc/src/transforms/wrap-export.ts#L6-L40)).

An exact capture count is not required for transport. `hasBoundArgs` establishes the one-slot boundary, and decrypting that slot yields the complete capture array to key and spread. A count would only support Next.js's additional generated/runtime invariant that checks the decrypted array length ([Next.js validation](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/use-cache/use-cache-wrapper.ts#L1980-L2003)). This research does not find a behavioral reason to extend the public transform ABI for that diagnostic.

The completed [mixed-directive composition research](https://github.com/hi-ogawa-agent/vite-plugin-react/blob/328f9e95/packages/plugin-rsc/docs/research/use-cache-transform-nextjs-comparison/FINDINGS-MIXED-DIRECTIVE-COMPOSITION.md) shows that independent complete transforms cannot assign consistent syntax and reference ownership when a module-level `"use server"` default is overridden by an inline custom directive. That result does not change the transport shape once a cached wrapper and claim have been produced. An external transport plugin is sufficient for modules and inline references it owns independently, while mixed-role modules require the shared classification and ownership handoff described there.

## Smallest Integration Change

No new plugin-rsc core API is required for the two unmixed transport cases in this note. Add one framework-owned cache transport plugin, modeled on `examples/custom-server-function`, with this composition:

1. Obtain `manager` through `getPluginApi()` and resolve the module's server-reference key.
2. In the RSC environment, apply `transformWrapExport` to module-level `"use cache"` modules and `transformHoistInlineDirective` to inline cache functions.
3. For inline caches set `stableName: true`, `exportWrappedHoist: true`, `encode: encryptActionBoundArgs`, and no `decode` hook.
4. Make the runtime callback construct the cache wrapper first and pass that result to `registerServerReference`.
5. Claim source export names or generated wrapped-hoist names through `manager.serverReferences.replaceClaim` and delete stale claims when no transform applies.
6. In client and SSR environments, proxy only module-level `"use cache"` exports with `transformDirectiveProxyExport`, then make the same claims.

The transform utilities are publicly exported ([transform exports](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/src/transforms/index.ts#L1-L6)), the package wildcard exposes the encryption runtime subpath ([package exports](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/package.json#L24-L30)), and the manager already aggregates claims from independent owners while rejecting conflicting identities or duplicate export ownership ([claim aggregation](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/src/plugins/server-reference.ts#L69-L124)). A convenience helper could reduce duplicated environment branching later, but the two required behaviors do not demonstrate a missing core capability.

## Narrow Development-And-Build E2E Proof

Add one future fixture to the existing plugin-rsc E2E matrix; do not implement it as part of this research note.

Fixture source:

1. A `cache-functions.ts` module begins with `"use cache"` and exports `cachedModule(value)`. It returns `{ value, nonce }`, where the backing cache runtime makes repeated equal calls return the same nonce.
2. A Server Component creates `cachedInline(value)` with inline `"use cache"`, captures a unique secret string, and passes the function to a Client Component through Flight.
3. The Client Component also imports `cachedModule` directly. Two buttons call the module reference and inline reference twice with the same argument, then once with a different argument, and render returned values.
4. Instrument only the test cache runtime with wrapper invocation/miss counters keyed by transport ID. Do not test persistence, replay, invalidation, TTL, or handler selection.

Run the same browser assertions once under `vite dev` and once against the production build/server:

- Initial HTML/Flight hydration succeeds, which exercises the SSR proxy path as well as browser proxy creation.
- The module-imported function call reaches the registered cache wrapper and returns its argument; two equal calls share a nonce and a different argument does not.
- The Flight-passed inline function reaches the exported generated wrapper; it returns both its invocation argument and captured secret; two equal capture/argument calls share a nonce and a different argument does not.
- The initial HTML and raw Flight response do not contain the captured secret in plaintext, while invoking the inline reference still reconstructs it.
- The two wrappers report distinct transport/cache IDs, proving module export and generated inline export identity do not collide.
- The production run starts from a clean build and invokes both functions without first importing their source modules through a dev request, proving the generated server-reference map contains both the source export and generated wrapped-hoist export.

This proof isolates transport because the existing browser callback already sends the server-reference ID and Flight-encoded arguments, while the RSC handler already resolves and invokes the exported callable ([browser transport](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/examples/basic/src/framework/entry.browser.tsx#L49-L64), [server transport](https://github.com/vitejs/vite-plugin-react/blob/6f2975a0c428e235030a7988d3d1879115d734c3/packages/plugin-rsc/examples/basic/src/framework/entry.rsc.tsx#L39-L59)). Any failure can therefore be assigned narrowly to proxy generation, wrapper registration, bound-payload handling, development resolution, or production claim emission rather than cache storage policy.

## Verification

The findings use direct source inspection and existing transform fixtures at the pinned commits. No implementation or test files were modified, and no test suites were run because the deliverable is a research note and future E2E specification.
