# Custom Server Function

This example demonstrates a third-party Vite plugin implementing a custom `"use custom-server"` directive alongside the built-in `"use server"` directive.

## Background

Server Function extensibility has two separate concerns:

- The directive owner transforms its syntax and registers the function with the React runtime.
- `@vitejs/plugin-rsc` owns bundler-level module identity, graph visibility, manifests, and reference resolution.

The custom plugin in [`custom-server-function-plugin.ts`](./custom-server-function-plugin.ts) transforms `"use custom-server"` and reports its exports as server reference claims. The RSC plugin aggregates those claims with its built-in `"use server"` claim instead of requiring one transform to own the entire module. This keeps custom syntax and metadata policy outside the RSC plugin while preserving a single canonical reference identity for the bundler.

The example separates two import graph shapes under [`src/features`](./src/features):

- `mixed-directives` exports inline built-in and custom Server Functions from one RSC-reachable module.
- `action-from-client` imports a module-level custom Server Function only from a Client Component. The custom plugin creates its client and SSR proxies, while the server reference manifest brings its implementation into the RSC build.

This is a low-level integration example rather than a proposed high-level Server Function API.

## Current E2E Coverage

[`../../e2e/custom-server-function.test.ts`](../../e2e/custom-server-function.test.ts) verifies in both development and production build modes that:

- a built-in Server Function and a custom Server Function can coexist in one module
- each function reaches the server and updates the rendered result
- a custom Server Function that is not statically imported by the RSC entry works through both the SSR and client proxy paths
- built-in, inline custom, and client-imported custom functions work as progressively enhanced forms without JavaScript
- in development, an export can move from the custom owner to the built-in owner and back without reloading, losing the built-in claim, or retaining a conflicting stale claim
