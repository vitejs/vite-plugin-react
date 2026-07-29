# Cross-Environment Action Reachability

This example implements a mechanical file-system route convention:

```text
routes/root.tsx   -> shared layout
routes/a/page.tsx -> /a
routes/b/page.tsx -> /b
```

Route A's server reference crosses a Client Component boundary through an ordinary JavaScript object:

```text
routes/a/page.tsx
  -> client.tsx ("use client")
  -> action-indirect.ts returns actionA through ordinary runtime value flow
  -> action.tsx ("use server")
```

During the final RSC build, the framework plugin traverses from each page root and records reachable Client Component references. During the final client build, it calls plugin-RSC's experimental `manager.getClientToServerReferenceReachability(this)` method and joins the two relations into `dist/client/route-action-manifest.json`.

A shared browser module stores a server reference without statically importing either route's action. Saving action A on `/a`, navigating to `/b`, and invoking the saved value sends the request to route B. The RSC handler consults the generated manifest and redispatches the request through `/a` within the same server output. Route-local `middleware.ts` establishes an action context with `AsyncLocalStorage`, so the action can verify that it executes under route A's middleware while the response continues rendering the visible `/b` route. This example intentionally covers the explicit-ID hydrated transport and does not parse React's progressive multipart action protocol.

The route manifest is a production-build feature. In development, no manifest is installed and the retained action executes under the current `/b` route context.
