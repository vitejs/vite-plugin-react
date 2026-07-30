# React Source Maps

This example isolates React development features that transport server source locations into the browser. Cases under `src/features` cover Server Reference definitions, Server Action and Server Component errors, server console replay, and a normal client error baseline.

The automated E2E test covers every Server Reference case below. It follows the same source-map path as Chrome DevTools:

1. Read the received function's `[[FunctionLocation]]` through CDP.
2. Find the browser script containing that function.
3. Fetch the Vite source map advertised by the script.
4. Resolve the browser function location to its original source declaration.

These assertions establish the verification infrastructure requested by [#1356](https://github.com/vitejs/vite-plugin-react/issues/1356) and document current behavior rather than requiring every transform to resolve to its ideal source site. Some export and inline forms currently resolve only to a nearby location. Fixing those mappings is tracked separately by [#1361](https://github.com/vitejs/vite-plugin-react/issues/1361); the fixture ensures each improvement can update a visible expectation without regressing the other forms.

Run the focused test from `packages/plugin-rsc`:

```sh
pnpm exec playwright test e2e/source-map.test.ts --project=chromium
```

## Manual Verification

Build the workspace packages, then start this example in development:

```sh
pnpm build
pnpm -C packages/plugin-rsc/examples/source-map dev
```

Open the printed URL in Chrome, ensure JavaScript source maps are enabled in DevTools, and select a route from the navigation.

### Server References

For `/named-function` and the other Server Reference export-shape routes, evaluate the corresponding entry from `window.__serverReferenceSourceLocations` in the Console. Right-click the returned function and choose **Show function definition**. Alternatively, inspect the rendered `SourceLocationCase` in React DevTools and use **Go to Definition** on its `action` prop.

For `/server-reference-from-client`, use the same workflow with `window.__serverReferenceSourceLocations['server-reference-from-client']`. This case uses React's client-generated `about://React/Client/...` proxy rather than a reference received through RSC.

The browser should open the original file under `src/features`, not generated transform code or an `about://React/...` proxy. An inline case should resolve to its directive-bearing function, while a re-export may resolve to the re-export statement.

### Errors And Console Replay

- `/server-action-error`: click **Throw Server Action error**, then inspect the browser console error and component stack. Server frames should resolve to `features/server-action-error/server.tsx`.
- `/server-component-error`: click **Throw Server Component error**, then inspect the browser console stack. The server frame should resolve to `features/server-component-error/server.tsx`.
- `/console-replay`: inspect the replayed `[source-map-console-replay]` entry in the browser console. Its source link should resolve to `features/console-replay/server.tsx`.
- `/client-error`: click **Throw client error** and confirm the browser stack resolves directly to `features/client-error/client.tsx`. This is the non-RSC baseline.

## Server Reference Export Shapes

These routes provide additional manual coverage of the `"use server"` transforms:

- `/named-function`: direct named function export and automated baseline.
- `/variables`: exported arrow and function-expression variables.
- `/defaults`: named, anonymous, and identifier default exports.
- `/specifiers`: local aliases, re-exports, and expanded `export *` declarations.
- `/inline-directive`: declaration, captured arrow, and direct function-expression hoisting.
- `/typescript-tsx`: composed TypeScript, JSX, and Server Function transforms.
- `/multiple-exports`: multiple generated registrations from one module.

The shared Client Component exposes received proxies as `window.__serverReferenceSourceLocations[caseName]` and renders a button to verify each function remains callable.

## Follow-up Coverage

TODO: automate the React Server Action and Server Component error stacks and console replay. These cases should resolve CDP-generated locations through the advertised source maps rather than asserting only displayed error text.
