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

## Manual Verification

Build the workspace packages, then start this example in development:

```sh
pnpm build
pnpm -C packages/plugin-rsc/examples/server-reference-source-location dev
```

Open the printed URL in Chrome and select a case from the navigation. Ensure JavaScript source maps are enabled in Chrome DevTools, then use either workflow:

1. Open the Console and evaluate `window.__serverReferenceSourceLocations['named-function']`, replacing the key with the selected case name. Right-click the returned function and choose **Show function definition**.
2. Open React DevTools, select the rendered `SourceLocationCase`, find its `action` prop, then use **Go to Definition**.

The browser should open the corresponding file under `src/features` at the original Server Function declaration. An inline case should resolve to its directive-bearing function, while a re-export may resolve to the re-export statement. It should not open generated transform code or an `about://React/Server/...` proxy. Clicking a case button separately verifies that the exposed function remains callable.

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
