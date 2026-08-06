# Local `"use cache"` example

This example demonstrates a minimal framework-owned cache for functions and components that execute inside the RSC environment. It composes `@vitejs/plugin-rsc`'s generic inline directive transform with its low-level RSC APIs.

Unlike the sibling [`use-cache-callable`](../use-cache-callable) example, these cached functions remain local implementation details and do not become React server references callable from Client Components. Neither React nor `@vitejs/plugin-rsc` defines `"use cache"`, and this example does not aim for full Next.js compatibility.

## Composition

[`vite.config.ts`](./vite.config.ts) uses `transformHoistInlineDirective()` to move each async function containing `"use cache"` to module scope. Closure captures become leading arguments, and the transformed function is wrapped by [`src/framework/use-cache-runtime.tsx`](./src/framework/use-cache-runtime.tsx):

```js
// TODO: illustrative example input -> output
```

## Runtime semantics

The cache wrapper uses `encodeReply()` to serialize call arguments into the same protocol React uses for Server Function arguments and use it as a cache key. On a cache miss, the runtime reconstructs the arguments with `decodeReply()`, invokes the implementation, and serializes its result with `renderToReadableStream()`.

Results are retained as Flight streams. `StreamCacher` duplicates the stored stream for every read, and `createFromReadableStream()` decodes each branch with the temporary-reference set from that invocation. This preserves RSC serialization semantics when cached output contains React nodes or references.

## Demonstrated cases

| Case             | Behavior                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Cached function  | Equal arguments reuse an entry; `revalidateCache()` clears every entry associated with the wrapped function. |
| Cached component | The component shell stays stable while temporary-reference `children` receive fresh values on each render.   |
| Captured closure | Hoisted closure captures and call-time arguments both participate in cache identity.                         |

The page exposes action and execution counts for the function and closure cases. An action runs on every submission, while the cached implementation runs only on a miss.

## Static shell and dynamic children

`TestComponent` receives its changing `children` inside a React element. With a temporary-reference set, `encodeReply()` records a reference marker rather than serializing that concrete element into the key. The cached Flight stream retains the corresponding placeholder, so replay can supply the current invocation's child while preserving the cached shell timestamp.

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
| [`src/root.tsx`](./src/root.tsx)                                               | Function, component shell, closure, and invalidation scenarios.   |
| [`../../e2e/use-cache.test.ts`](../../e2e/use-cache.test.ts)                   | Development and production behavioral coverage.                   |
