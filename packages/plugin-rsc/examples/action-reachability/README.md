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

In production, a generated route-action manifest lets the RSC handler redispatch the action request through a route whose graph can load the action. This example enables manifest routing only in production, so development stays on the current route.

## Application graphs

For simplicity, the app routes and their graph roots are declared manually. Route `/a` reaches action A through a Client Component and an ordinary runtime return value:

```text
src/app/a/page.tsx
  -> client.tsx ("use client")
  -> action-indirect.ts returns actionA
  -> action.tsx ("use server")
```

## Manifest generation

During the RSC build, the manifest plugin traverses each route graph and records directly reachable server reference IDs and reachable client reference keys. During the client build, it calls the experimental `manager.getClientToServerReferenceReachability(this)` API to map those client references to server reference IDs. For each route, it unions the directly reachable IDs with the IDs reachable through its client references.

After all environment builds finish, the plugin installs the mapping in the RSC output for runtime routing.

## Request redispatch

For the production scenario above, the RSC handler finds action A under `/a` in the manifest and creates a new action request for `/a`. That request re-enters `/a` middleware, so the action observes `MIDDLEWARE_A`. It also preserves `/b` as the render URL, so the response continues rendering page B.

Development skips route-aware redispatch. The handler executes action A on `/b`, so the action observes `MIDDLEWARE_B`.

## Protocol scope

For simplicity, route-aware redispatch covers only hydrated action calls that carry an explicit action ID. Progressive multipart form actions still use the baseline `decodeAction()` path without manifest routing.
