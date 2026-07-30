# Server Reference Source Location

This example isolates the development source location attached to a module-level Server Function. The RSC entry passes the function to a Client Component, so React serializes its server location and reconstructs an eval-backed proxy in the browser.

The E2E test follows the same path Chrome DevTools uses at a lower level:

1. Read the received function's `[[FunctionLocation]]` through CDP.
2. Match its `about://React/Server/...` eval script.
3. Fetch the Vite source map advertised by that script.
4. Resolve the generated proxy location to the original `export async function` declaration.

This verifies the complete integration between the `"use server"` transform, Vite's module-runner offset correction, React's development Server Reference metadata, and the browser proxy.

Run the focused test from `packages/plugin-rsc`:

```sh
pnpm exec playwright test e2e/server-reference-source-location.test.ts --project=chromium
```

## Follow-up Coverage

The current case is the direct named function-export baseline. Extend the fixture to cover each source-map-sensitive lowering path:

- Exported async arrow and function-expression variables.
- Multiple declarations generated from one export boundary.
- Named and anonymous default function exports.
- Default identifier exports.
- Local export specifiers and aliases.
- Re-exported Server Functions and expanded `export *` declarations.
- Inline `"use server"` function hoisting.
- TypeScript and TSX inputs that compose transpilation maps with the Server Function transform.
- Multiple Server Functions whose generated registrations map to distinct source exports.
