# Partial prerendering example

This example builds a reusable static HTML shell around request-time React Server Component (RSC) content. Build-time prerendering fills the RSC cache, captures partial Flight output, and asks React DOM to persist an HTML `prelude` with `postponed` state. At request time, the server can stream that prelude immediately while rendering fresh Flight data and resuming the postponed HTML.

For visual walkthroughs, see the [component and render flow](https://artifacts.hiro18181.workers.dev/vite-plugin-react-ppr-component-flow.html) and the [prerender readiness race](https://artifacts.hiro18181.workers.dev/vite-plugin-react-ppr-prerender-readiness.html).

## Usage

```sh
pnpm dev
pnpm build
pnpm preview
```

Development normally prerenders a live shell for each document request. Add `?__ppr` to a URL, such as `http://localhost:5173/?__ppr`, to exercise the same serialized manifest round trip used by the production build.

## Component model

The PPR-relevant shape in [`src/root.tsx`](./src/root.tsx) places cached and dynamic work in one tree:

```tsx
<CachedLayout>
  <Suspense fallback={<DynamicFallback />}>
    <DynamicContent url={url} />
  </Suspense>
  <Suspense fallback={<CachedFallback />}>
    <CachedAsyncContent />
  </Suspense>
</CachedLayout>
```

| Component            | Behavior                                                                                                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CachedLayout`       | Caches the document frame, navigation, and its render timestamp. Its cached bytes contain temporary-reference placeholders rather than concrete `children`, so each invocation can supply fresh values through those slots. |
| `CachedAsyncContent` | Waits 100 ms on a cache miss. The warmup pass tracks that fill, materializes its Flight result, and reuses it in later renders.                                                                                             |
| `DynamicContent`     | Calls `markDynamic()`. It returns a pending promise during prerender and `undefined` during a request render, so the request continues immediately into its request-time work.                                              |

`createCachedComponent` gives this example the semantics of a small `"use cache"` runtime without requiring a compiler transform. Its argument and result serialization follows [`examples/basic/src/framework/use-cache-runtime.tsx`](../basic/src/framework/use-cache-runtime.tsx). Temporary references are important for `CachedLayout`: its cache key and bytes retain reference markers while the matching reference set supplies the concrete dynamic `children` on each invocation.

Cached work must not call `markDynamic()` directly. The hanging dynamic promise would also keep that cache fill pending forever. A production framework can detect an active cache scope and report this as invalid usage.

## Prerender decision

Each RSC prerender races natural completion against readiness for a partial cutoff:

```text
result completes -> fully static RSC output

dynamic boundary reached
  + discovered cache fills settled
  + one task for React to retry and reveal follow-on fills
  -> ready -> abort and retain partial RSC output
```

The two branches are both necessary. A fully static render does not call `markDynamic()`, so its `ready` promise remains pending and `result` wins naturally. A partial render may be cut off only after `dynamicReached` proves that its suspension is intentional and `pendingWork` proves that no tracked cache fill can add more static output.

[`src/framework/prerender-context.ts`](./src/framework/prerender-context.ts) implements this compact model with `AsyncLocalStorage`, a set of cache promises, and one `setTimeout(0)` retry window. Production frameworks make the same kind of framework-defined approximation with more complete cache, module, and scheduler tracking.

## Runtime API layers

PPR composes two React runtime families. The RSC layer produces Flight, while React DOM turns that Flight into prerendered and resumed HTML:

```ts
// React Server Components / Flight
import { prerender as prerenderRsc } from '@vitejs/plugin-rsc/rsc/static'
import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc/server'

// React DOM / HTML
import { prerender as prerenderHtml } from 'react-dom/static.edge'
import { resume } from 'react-dom/server.edge'
```

| Layer            | Build-time API                                          | Request-time API                                             | Result                                                                    |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| RSC / Flight     | `@vitejs/plugin-rsc/rsc/static` → `prerender()`         | `@vitejs/plugin-rsc/rsc/server` → `renderToReadableStream()` | Partial build-time Flight or fresh request-time Flight                    |
| Flight decoding  | `@vitejs/plugin-rsc/ssr` → `createFromReadableStream()` | The same decoder                                             | A React tree consumed by React DOM                                        |
| React DOM / HTML | `react-dom/static.edge` → `prerender()`                 | `react-dom/server.edge` → `resume()`                         | HTML `prelude` plus `postponed` state, then the resumed HTML continuation |

The two `prerender()` functions operate at different layers. The plugin's `/rsc/static` export is a Vite-aware wrapper around the `react-server-dom` static renderer and returns a Flight `prelude`. React DOM's `prerender()` consumes the decoded tree and returns an HTML `prelude` with serializable `postponed` state. Only the React DOM layer has the matching `resume()` operation.

Applications should use the `@vitejs/plugin-rsc` exports rather than importing its vendored `react-server-dom` runtime directly because the wrappers provide the Vite client-reference manifest.

## Build flow

Each static path goes through three render steps:

1. **Warm the RSC cache.** `@vitejs/plugin-rsc/rsc/static` `prerender()` discovers cache misses and waits for their useful static work to finish. Its output is discarded because it records the process of filling the cache rather than the final warm-cache shell.
2. **Capture partial Flight.** The same RSC `prerender()` renders a clean pass against the warm cache. Cached content is immediately available, while `DynamicContent` remains pending at `markDynamic()`. Cutting off here produces the static Flight prefix around that intentional hole.
3. **Capture resumable HTML.** `react-dom/static.edge` `prerender()` consumes the decoded partial Flight tree. `preventStreamClose` keeps the missing segment pending, so React DOM emits an HTML `prelude` for the shell and serializable `postponed` state describing where request-time rendering must continue.

The build persists the shared RSC cache and each route's `{ prelude, postponed }` result. Repeating the RSC render is safe because React rendering must already be pure and restartable; the cache ensures expensive static work is performed on the miss and replayed by the final pass.

The demo intentionally requires a dynamic HTML hole so every generated route exercises `resume`. A complete framework would also persist and serve fully static results and other valid prerender outcomes.

### Development flow

Development runs the same warmup, final RSC prerender, and React DOM prerender on demand for each document request. It passes the live `{ prelude, postponed }` result directly into request-time resume instead of loading persisted build output.

Adding `?__ppr` exercises the persistence boundary without a production build. The dev server prerenders all static paths, serializes the shared cache and route results, then revives the selected route before serving it. The rendering model stays the same; only the handoff changes from live objects to their persisted representation.

## Request flow

The request combines three persisted inputs with fresh request data:

```text
persisted HTML prelude ---------------------------------> response prefix

persisted RSC cache
  + request data ------------- normal RSC render() -----> fresh Flight

persisted postponed state
  + fresh request-time Flight -- React DOM resume() ---> response suffix

fresh request-time Flight ------------------------------> browser hydration data
```

The HTML `prelude` is already complete static output, so it can stream without waiting for request-time work. In parallel, `@vitejs/plugin-rsc/rsc/server` `renderToReadableStream()` produces fresh Flight in which `markDynamic()` no longer suspends and `DynamicContent` can read the current request.

`react-dom/server.edge` `resume()` combines the decoded fresh Flight tree with the persisted `postponed` state and produces the HTML continuation. The fresh Flight stream is split because React DOM consumes one branch while the other is injected into the response for browser hydration. The final response is the persisted prelude followed by this resumed HTML and hydration data.

This in-process handoff models an architecture where an edge or CDN serves the static prelude while a dynamic backend produces the resumed stream. The transport boundary is simplified, but the stream contract is the same.

## Observable behavior

- The layout and cached async timestamps are generated during prerender and remain stable across navigation and document reloads.
- The dynamic timestamp is generated per request and changes across navigation or reload.
- The dynamic fallback belongs to the static shell. Without JavaScript it remains visible while resumed dynamic HTML stays hidden; React's browser instructions reveal the dynamic content and replace the fallback.

## Deliberate approximations

| Concern         | This example                                                                                        | Production elaboration                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Cache readiness | Tracks materialized cache-entry promises in `pendingWork`.                                          | Track lazy cache streams, module loading, and other framework-owned static work with separate readiness signals.                             |
| Dynamic witness | `dynamicReached` records that `markDynamic()` created an intentional hole.                          | vinext uses a similar `hasDynamicBoundary` flag; Next.js can derive partiality from output still pending after its static scheduling window. |
| RSC settling    | One `setTimeout(0)` lets React retry settled cache reads before readiness is rechecked.             | Use runtime-specific task coordination and a more robust cutoff window.                                                                      |
| HTML settling   | A fixed 50 ms delay allows shell and client-reference work to progress before React DOM is aborted. | Track module work and coordinate the final prerender cutoff.                                                                                 |
| Dynamic backend | Runs the backend render and stream stitching in the same process.                                   | An edge, CDN, or adapter can fetch the resumed stream from a separate backend.                                                               |
| Cache storage   | Materializes Flight bytes so one promise represents both the entry and its completion.              | Keep cache streams lazy and use a separate CacheSignal-like completion mechanism.                                                            |

These are deliberate runtime boundaries, not attempts to detect arbitrary application promises. Cache and dynamic work must enter through framework-owned APIs to participate in prerender readiness.

## Source map

| File                                                                         | Responsibility                                                                |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`src/root.tsx`](./src/root.tsx)                                             | Example cached, dynamic, and Suspense component tree.                         |
| [`src/framework/cache.ts`](./src/framework/cache.ts)                         | RSC cache keys, serialization, persistence, and prerender work tracking.      |
| [`src/framework/prerender-context.ts`](./src/framework/prerender-context.ts) | Request-local cache readiness and dynamic-boundary state.                     |
| [`src/framework/entry.rsc.tsx`](./src/framework/entry.rsc.tsx)               | Build-time route prerender, RSC cutoff, request dispatch, and stream handoff. |
| [`src/framework/entry.ssr.tsx`](./src/framework/entry.ssr.tsx)               | React DOM prerender and request-time resume.                                  |
| [`src/framework/entry.browser.tsx`](./src/framework/entry.browser.tsx)       | Hydrates from the Flight payload injected into the response.                  |
| [`vite.config.ts`](./vite.config.ts)                                         | Environment entries and build-time PPR orchestration.                         |

## Prior art

- [Next.js cache warmup and final prerender](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/app-render.tsx#L7905-L8490)
- [Next.js `CacheSignal`](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/cache-signal.ts)
- [vinext fallback-shell prerender state](https://github.com/cloudflare/vinext/blob/fd1cc3d3ddaaec8c130d5e4bcae3a6f761089756/packages/vinext/src/shims/ppr-fallback-shell.ts)
- [Next.js adapter PPR request flow](https://nextjs.org/docs/app/api-reference/adapters/implementing-ppr-in-an-adapter#2-runtime-flow-serve-cached-shell-and-resume-in-background)
