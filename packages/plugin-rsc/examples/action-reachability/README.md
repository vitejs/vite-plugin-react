# Cross-Environment Action Reachability

This example demonstrates route-aware dispatch for a retained server action. Action A is reachable from route `/a`'s application graph but not from route `/b`'s graph. The browser can still retain its server reference, navigate to `/b`, and invoke it there.

The example follows this sequence:

1. Open `/a` and save action A in a shared browser module.
2. Navigate to `/b`, retaining the saved server reference.
3. Invoke action A through an explicit-ID action request to `/b`.

| Mode        | Action executes through | Result                     | Rendered page |
| ----------- | ----------------------- | -------------------------- | ------------- |
| Production  | `/a` middleware         | `ACTION_A_OK:MIDDLEWARE_A` | `/b`          |
| Development | `/b` middleware         | `ACTION_A_OK:MIDDLEWARE_B` | `/b`          |

In production, a generated route-action manifest lets the RSC handler redispatch the action request through a route whose graph can load the action. Development has no manifest, so the request stays on its current route.

## Application graphs

The app manually declares two routes in `src/app/routes.tsx`:

```text
src/app/root.tsx   -> shared layout
src/app/a/page.tsx -> /a
src/app/b/page.tsx -> /b
```

The manifest plugin lists `src/app/root.tsx` and the route-specific page module as graph roots for each route. Route `/a` reaches action A through a Client Component and an ordinary runtime return value:

```text
src/app/a/page.tsx
  -> client.tsx ("use client")
  -> action-indirect.ts returns actionA
  -> action.tsx ("use server")
```

## Manifest generation

During the RSC build, the manifest plugin traverses each route graph and records directly reachable server reference IDs and reachable client reference keys. During the client build, it calls the experimental `manager.getClientToServerReferenceReachability(this)` API to map those client references to server reference IDs. For each route, it unions the directly reachable IDs with the IDs reachable through its client references.

The source imports `virtual:route-action-manifest`. During the production build, the plugin rewrites that import to `__route_action_manifest.js`, then writes the mapping to `dist/rsc/__route_action_manifest.js` after all environment builds finish. The RSC handler loads this ESM sidecar at runtime.

## Request redispatch

For the production scenario above, the RSC handler finds action A under `/a` in the manifest and creates a new action request for `/a`. That request re-enters `/a` middleware, so the action observes `MIDDLEWARE_A`. It also preserves `/b` as the render URL, so the response continues rendering page B.

In development, `virtual:route-action-manifest` exports `null`. The handler executes action A on `/b`, so the action observes `MIDDLEWARE_B`.

## Protocol scope

Route-aware redispatch applies only to hydrated action calls that carry an explicit action ID. Progressive multipart form actions are decoded, but the handler does not extract their action IDs from the multipart fields before calling `decodeAction()`, so it cannot consult the route-action manifest first.
