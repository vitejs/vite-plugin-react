# Server Reference Source Location

This example isolates development source locations attached to Server Functions. Each case under `src/features` passes a function to a Client Component, so React serializes its server location and reconstructs an eval-backed proxy in the browser.

The E2E test follows the same path Chrome DevTools uses at a lower level:

1. Read the received function's `[[FunctionLocation]]` through CDP.
2. Match its `about://React/Server/...` eval script.
3. Fetch the Vite source map advertised by that script.
4. Resolve the generated proxy location to its original source declaration.

This verifies the complete integration between the `"use server"` transform, Vite's module-runner offset correction, React's development Server Reference metadata, and the browser proxy.

Run the focused test from `packages/plugin-rsc`:

```sh
pnpm exec playwright test e2e/server-reference-source-location.test.ts --project=chromium
```

## Cases

The navigation provides these routes for manual invocation and inspection:

- `/named-function`: direct named function export.
- `/variables`: exported arrow and function-expression variables.
- `/defaults`: named, anonymous, and identifier default exports.
- `/specifiers`: local aliases, re-exports, and expanded `export *` declarations.
- `/inline-directive`: inline `"use server"` function hoisting.
- `/typescript-tsx`: composed TypeScript, JSX, and Server Function transforms.
- `/multiple-exports`: multiple generated registrations from one module.

The Client Component also exposes the received proxies as `window.__serverReferenceSourceLocations[caseName]` for manual console and DevTools inspection.

## Follow-up Coverage

The automated E2E assertion currently covers only `named-function`. TODO: apply the same CDP and source-map assertion to every case above, including distinct expectations for re-exports and generated inline reference names.
