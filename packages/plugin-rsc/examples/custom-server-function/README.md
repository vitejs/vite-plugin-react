# Custom Server Function

This example demonstrates a third-party Vite plugin implementing a custom `"use custom-server"` directive alongside the built-in `"use server"` directive. Both functions are exported from the same module and remain independently callable.

## Background

Server Function extensibility has two separate concerns:

- The directive owner transforms its syntax and registers the function with the React runtime.
- `@vitejs/plugin-rsc` owns bundler-level module identity, graph visibility, manifests, and reference resolution.

The custom plugin in [`vite.config.ts`](./vite.config.ts) transforms `"use custom-server"` and reports its exports as server reference claims. The RSC plugin aggregates those claims with its built-in `"use server"` claim instead of requiring one transform to own the entire module. This keeps custom syntax and metadata policy outside the RSC plugin while preserving a single canonical reference identity for the bundler.

This is a low-level integration example rather than a proposed high-level Server Function API.

## Current E2E Coverage

[`../../e2e/custom-server-function.test.ts`](../../e2e/custom-server-function.test.ts) verifies in both development and production build modes that:

- a built-in Server Function and a custom Server Function can coexist in one module
- each function reaches the server and updates the rendered result

## Follow-up E2E TODO

- Exercise claim replacement and cleanup during HMR by adding, removing, or changing a custom directive, while verifying that the built-in owner's claim remains intact and stale custom claims disappear.
- Exercise custom references through the client and SSR proxy paths, including modules that are not also statically imported by the RSC entry.
- Exercise bound arguments and closure captures through serialization, encryption, and server invocation.
