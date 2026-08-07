# Persistent callable `"use cache"` example

This example extends the sibling [`use-cache-callable`](../use-cache-callable) example with cache entries that are independent of transformed function objects. It retains inline and file directive transforms, callable React server references, argument admission, and encrypted captures. The included route focuses on file-level persistent value replay with a filesystem-backed cache.

Neither React nor `@vitejs/plugin-rsc` defines `"use cache"`. The example composes plugin-rsc's public directive transforms and server-reference registry to demonstrate the framework integration.

## Development invalidation

[`callable-cache-plugin.ts`](./callable-cache-plugin.ts) assigns each transformed cache module a development timestamp. Its `hotUpdate` hook walks reverse importers from an updated RSC module and invalidates affected cache modules. Retransformation assigns a new timestamp, so edits to a cached function or its direct and transitive dependencies produce new persistent cache keys. Restarting the development server also retransforms modules with new timestamps, so edits made while it was stopped cannot reuse stale entries.

The cache key consists of the server-reference identity, development transform timestamp when applicable, and RSC-serialized arguments.

## Persistent values

[`src/framework/persistent-cache.ts`](./src/framework/persistent-cache.ts) stores entries under `.use-cache`. The runtime serializes each result to Flight bytes, writes those bytes to the filesystem cache, and reconstructs a fresh stream for every hit.

The filesystem handler is intentionally minimal. It stands in for an external key-value or distributed cache without adding service dependencies to the example.

## Scenario

The route invokes a file-level cached server reference. Its E2E coverage verifies repeated-key hits, value replay after restarting the same production build, fresh development timestamps after restart, and invalidation after edits to the cached function or its direct and transitive dependencies.

## Scope

The example focuses on persistent identity and development invalidation. It does not implement lifetimes, tags, eviction, distributed locking, deployment cache namespaces, or automatic cleanup. Do not reuse `.use-cache` across separate production builds because their stable reference identities could replay stale entries. Development timestamps make old entries unreachable, but those files accumulate until the cache is reset.

## Usage

```sh
pnpm dev
pnpm build
pnpm preview
```

## Source map

| Source                                                                             | Responsibility                                                                 |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`callable-cache-plugin.ts`](./callable-cache-plugin.ts)                           | Directive transforms, server references, cache identity, and HMR invalidation. |
| [`src/framework/use-cache-runtime.tsx`](./src/framework/use-cache-runtime.tsx)     | Argument admission, cache lookup, execution, and Flight replay.                |
| [`src/framework/persistent-cache.ts`](./src/framework/persistent-cache.ts)         | Filesystem-backed entry storage.                                               |
| [`src/features`](./src/features)                                                   | Callable file-level cache scenario.                                            |
| [`../../e2e/use-cache-persistent.test.ts`](../../e2e/use-cache-persistent.test.ts) | Persistence and dependency-update coverage.                                    |
