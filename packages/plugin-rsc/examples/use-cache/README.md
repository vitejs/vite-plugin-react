# Local `"use cache"` example

This example demonstrates a minimal framework-owned cache for functions and components that execute inside the RSC environment. It composes `@vitejs/plugin-rsc`'s generic inline directive transform with its low-level RSC APIs.

Unlike the sibling [`use-cache-callable`](../use-cache-callable) example, these cached functions remain local implementation details and do not become React server references callable from Client Components. Neither React nor `@vitejs/plugin-rsc` defines `"use cache"`, and this example does not aim for full Next.js compatibility.

## Composition

[`vite.config.ts`](./vite.config.ts) uses `transformHoistInlineDirective()` to move each async function containing `"use cache"` to module scope. Closure captures become leading arguments, and the transformed function is wrapped by [`src/framework/use-cache-runtime.tsx`](./src/framework/use-cache-runtime.tsx):

```js
// -- input --
function Component(prefix) {
  async function cachedFn(value) {
    'use cache'
    return `${prefix}: ${value}`
  }
  /// ...
}

// -- output --
async function $$hoist_cachedFn(prefix, value) {
  return `${prefix}: ${value}`
}

function Component(prefix) {
  const cachedFn = $$framework_cacheRuntime($$hoist_cachedFn).bind(null, prefix)
  /// ...
}
```

## Runtime semantics

The cache wrapper uses `encodeReply()` to serialize call arguments into the same protocol React uses for Server Function arguments and use it as a cache key. On a cache miss, the runtime reconstructs the arguments with `decodeReply()`, invokes the implementation, and serializes its result with `renderToReadableStream()`.

Results are retained as Flight streams. `StreamCacher` duplicates the stored stream for every read, and `createFromReadableStream()` decodes each branch with the temporary-reference set from that invocation. This preserves RSC serialization semantics when cached output contains React nodes or references.

## Examples

| Route               | Demonstrates                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/cached-function`  | Equal arguments reuse an entry; `revalidateCache()` clears every entry associated with the wrapped function. |
| `/cached-component` | The component shell stays stable while temporary-reference `children` receive fresh values on each render.   |
| `/captured-values`  | Hoisted captured values and call-time arguments both participate in cache identity.                          |

The cached-function and captured-values routes display call and execution counts. Every submission calls the function, while the cached implementation runs only on a miss.

## Static shell and dynamic children

`CachedShell` receives its changing `children` inside a React element. With a temporary-reference set, `encodeReply()` records a reference marker rather than serializing that concrete element into the key. The cached Flight stream retains the corresponding placeholder, so replay can supply the current invocation's child while preserving the cached shell timestamp.

The wrapper element is intentional. A raw string child is serializable by value, so changing it would change the cache key and rerun the component instead of demonstrating a stable shell with a dynamic slot.

## Scope

The cache is process-local and in-memory. Entries are scoped to each wrapped function and support explicit invalidation, but the example does not implement persistence, lifetimes, tags, eviction, distributed storage, or production invalidation policy.

## Usage

```sh
pnpm dev
pnpm build
pnpm preview
```

## Source map

| Source                                                                         | Responsibility                                                    |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [`vite.config.ts`](./vite.config.ts)                                           | Inline directive transform and runtime wrapping.                  |
| [`src/framework/use-cache-runtime.tsx`](./src/framework/use-cache-runtime.tsx) | Argument keys, miss execution, Flight stream storage, and replay. |
| [`src/root.tsx`](./src/root.tsx)                                               | Scenario routing, navigation, and descriptions.                   |
| [`src/features`](./src/features)                                               | Cached function, component shell, and captured-value scenarios.   |
| [`../../e2e/use-cache.test.ts`](../../e2e/use-cache.test.ts)                   | Development and production behavioral coverage.                   |
