# Cross-Environment Action Reachability

This example implements a small framework convention with two route roots:

```text
/       -> routes/home/page.tsx
/other  -> routes/other/page.tsx
```

The home route's server reference crosses a Client Component boundary through an ordinary JavaScript object:

```text
routes/home/page.tsx
  -> client.tsx ("use client")
  -> commands.tsx exports { objectWrappedAction }
  -> action.tsx ("use server")
```

During the final RSC build, the framework plugin traverses from each page root and records reachable Client Component references. During the final client build, it calls plugin-RSC's experimental `manager.getClientToServerReferenceReachability(this)` method and joins the two relations into `dist/client/route-action-manifest.json`.

The hydrated home action waits before invoking its server reference. Navigating to `/other` during that wait causes the action request to arrive on the other route. The RSC handler consults the generated manifest and redispatches the request through `/` within the same server output. Route-local `middleware.ts` establishes an action context with `AsyncLocalStorage`, so the action can verify that it executes under the home route's middleware while the response continues rendering the visible `/other` route. This example intentionally covers the explicit-ID hydrated transport and does not parse React's progressive multipart action protocol.
