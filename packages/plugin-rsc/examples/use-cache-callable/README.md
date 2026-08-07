# Callable `"use cache"` example

This example demonstrates a framework-owned `"use cache"` directive whose cached functions remain callable as React server references. It composes `@vitejs/plugin-rsc`'s generic directive transforms, server-reference registry, and low-level RSC serialization APIs.

Unlike the sibling [`use-cache`](../use-cache) example, these cached functions can cross a Server Component to Client Component boundary and run through hydrated or progressively enhanced forms. Neither React nor `@vitejs/plugin-rsc` defines `"use cache"`, and this example does not aim for full Next.js compatibility.

## Architecture

[`callable-cache-plugin.ts`](./callable-cache-plugin.ts) owns the directive policy by composing the public `transformWrapExport()`, `transformHoistInlineDirective()`, and `transformDirectiveProxyExport()` helpers. In the RSC environment it wraps module-level exports or hoists inline functions, registers the cached wrapper with React, and reports the reference through `getPluginApi().manager.serverReferences`. In browser and SSR environments it generates the corresponding server-reference proxies.

[`src/framework/use-cache-runtime.tsx`](./src/framework/use-cache-runtime.tsx) owns argument admission, cache identity, execution, and result replay:

```tsx
// -- input --
function Component() {
  const captured = 'value'
  async function cachedAction(argument: string) {
    'use cache'
    return `${captured}: ${argument}`
  }
  /// ...
}

// -- output ---
async function $$hoist_cachedAction(captures: unknown[], argument: string) {
  const [captured] = captures
  return `${captured}: ${argument}`
}

// callable externally as server function
export const $$hoist_reference_cachedAction = registerServerReference(
  $$framework_cacheRuntime($$hoist_cachedAction, { argumentCount: 1 }),
)

function Component() {
  const captured = 'value'
  const cachedAction = $$reference.bind(
    null,
    $$framework_encryptCacheCaptures([captured]),
  )
  /// ...
}
```

Arguments are serialized with React's `encodeReply()` so values supported by the RSC protocol can participate in cache identity. On a miss, the runtime decodes those same arguments, invokes the private implementation, and stores its result as a replayable Flight stream.

## Examples

| Route                                  | Demonstrates                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `/inline-directive`                    | An inline cached function captures a Server Component value and is passed to a Client Component form. |
| `/file-directive-from-server`          | A module-level cached export is imported on the server and passed to a Client Component.              |
| `/file-directive-from-client`          | A Client Component imports a cached export through its generated proxy.                               |
| `/file-directive-extra-arguments`      | A zero-parameter module export excludes React-supplied caller arguments.                              |
| `/inline-directive-extra-arguments`    | A zero-parameter inline function uses transform metadata to exclude React-supplied caller arguments.  |
| `/use-cache-in-use-server-from-client` | A Client Component imports an inline cached export from a `"use server"` module.                      |
| `/use-cache-in-use-server-from-server` | A Server Component passes an inline cached export from a `"use server"` module.                       |
| `/use-server-in-use-cache-from-client` | A Client Component imports an uncached inline server export from a `"use cache"` module.              |
| `/use-server-in-use-cache-from-server` | A Server Component passes an uncached inline server export from a `"use cache"` module.               |
| `/protected-captures`                  | Inline captures cross the client boundary encrypted while decoded values define cache identity.       |

Each route displays submission and execution counts. Every form submission calls the server reference, while the function body runs only on a cache miss.

## Protected captures

Inline closure captures must not cross the client boundary as trusted plaintext. The transform's `encode` hook binds a framework-owned envelope with a synchronous sentinel and an asynchronous encrypted payload:

```text
registered wrapper.bind(null, encryptCacheCaptures([captured]))
```

The cache runtime recognizes the envelope, preserves it while admitting declared caller arguments, and decrypts it once. It then uses the same logical argument shape for cache identity and execution:

```ts
executionArguments = [captures, ...invocationArguments]
```

The transformed private implementation receives the decoded capture array and only destructures it back into source bindings. Decryption therefore belongs to the framework runtime rather than being repeated in generated output.

## Argument admission

The plugin derives `argumentCount` from function AST metadata. The runtime preserves an inline function's bound capture envelope, then admits only the declared invocation arguments. This prevents arguments supplied by helpers such as `useActionState()` from changing either cache identity or execution when the source function does not declare them. Functions with a rest parameter keep unrestricted argument admission.

## Form caveat

Hydrated forms rendered by SSR can retain React's `$ACTION_*` transport fields in their `FormData`. For an inline reference, those fields can include freshly encrypted bound captures, so submitting an unchanged direct form after a reload can miss the cache. This matches the behavior isolated by the [Next.js form reload reproduction](https://github.com/hi-ogawa/reproductions/tree/main/next-use-cache-form-reload).

Framework-specific form handling can avoid making React transport fields part of application cache identity. The protected-captures route demonstrates the small adapter approach by extracting its user field before calling the cached reference.

## Scope

The cache is process-local and in-memory. Entries are scoped to each wrapped function and can be reset or explicitly revalidated, but the example does not implement persistence, lifetimes, tags, eviction, distributed storage, or production invalidation policy. Its purpose is to demonstrate transform, server-reference transport, serialization, and protected-capture integration.

## Usage

```sh
pnpm dev
pnpm build
pnpm preview
```

## Source map

| Source                                                                         | Responsibility                                                               |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [`callable-cache-plugin.ts`](./callable-cache-plugin.ts)                       | Directive transforms, argument metadata, registration, and proxy generation. |
| [`src/framework/use-cache-runtime.tsx`](./src/framework/use-cache-runtime.tsx) | Capture adaptation, argument admission, cache keys, execution, and replay.   |
| [`src/features`](./src/features)                                               | Inline, file-level, caller-argument, and protected-capture scenarios.        |
| [`../../e2e/use-cache-callable.test.ts`](../../e2e/use-cache-callable.test.ts) | Hydrated, progressive, development, and production behavioral coverage.      |
