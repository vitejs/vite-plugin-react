# Persistent callable `"use cache"` example

This example extends the sibling [`use-cache-callable`](../use-cache-callable) example with cache entries that are independent of transformed function objects. It combines framework-owned inline and file-level directives, callable React server references, encrypted closure captures, self-contained Flight serialization, and a filesystem-backed cache.

Neither React nor `@vitejs/plugin-rsc` defines `"use cache"`. The example composes plugin-rsc's public directive transforms and server-reference registry to demonstrate the framework integration.

## Development invalidation

[`callable-cache-plugin.ts`](./callable-cache-plugin.ts) assigns each transformed cache module a development generation. Its `hotUpdate` hook walks reverse importers from an updated RSC module and invalidates affected cache modules. Retransformation advances their generations, so edits to a cached function or its direct and transitive dependencies produce new persistent cache keys.

The cache key consists of the server-reference identity, development generation when applicable, and RSC-serialized logical arguments. Inline captures are encrypted while crossing the client boundary, then decrypted before they participate in cache identity and execution.

## Persistent values

[`src/framework/persistent-cache.ts`](./src/framework/persistent-cache.ts) stores entries under `.use-cache`. The runtime serializes each result to complete Flight bytes without invocation-local temporary references, writes those bytes to the external store, and reconstructs a fresh stream for every hit.

The filesystem handler is intentionally minimal. It stands in for an external key-value or distributed cache without adding service dependencies to the example.

## Examples

The routes are inherited from `use-cache-callable` so both file-level and inline transforms, client invocation, argument admission, and encrypted captures remain exercised. The file-directive-from-server route additionally imports direct and transitive dependencies for development invalidation coverage.

## Scope

The example focuses on persistent identity and development invalidation. It does not implement lifetimes, tags, eviction, distributed locking, or deployment cache namespaces.

## Usage

```sh
pnpm dev
pnpm build
pnpm preview
```

## Source map

| Source                                                                             | Responsibility                                                                      |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`callable-cache-plugin.ts`](./callable-cache-plugin.ts)                           | Directive transforms, server references, cache identity, and HMR invalidation.      |
| [`src/framework/use-cache-runtime.tsx`](./src/framework/use-cache-runtime.tsx)     | Argument admission, capture decryption, cache lookup, execution, and Flight replay. |
| [`src/framework/persistent-cache.ts`](./src/framework/persistent-cache.ts)         | Filesystem-backed entry storage.                                                    |
| [`src/features`](./src/features)                                                   | Callable inline and file-level cache scenarios.                                     |
| [`../../e2e/use-cache-persistent.test.ts`](../../e2e/use-cache-persistent.test.ts) | Persistence, encrypted captures, and dependency-update coverage.                    |
