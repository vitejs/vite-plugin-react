# Cross-Environment Action Reachability

This example demonstrates route-aware dispatch for a retained server action. Action A is associated with route `/a` because `/a`'s application graph reaches it, while `/b`'s graph does not. The browser can still retain its server reference, navigate to `/b`, and invoke it there.

See [#1337](https://github.com/vitejs/vite-plugin-react/issues/1337) for the broader discussion of route-aware server reference manifests.

The example follows this sequence:

1. Open `/a` and save action A in a shared browser module.
2. Navigate to `/b`, retaining the saved server reference.
3. Invoke action A through an explicit-ID action request to `/b`.

| Mode        | Action executes through | Result                     | Rendered page |
| ----------- | ----------------------- | -------------------------- | ------------- |
| Production  | `/a` middleware         | `ACTION_A_OK:MIDDLEWARE_A` | `/b`          |
| Development | `/b` middleware         | `ACTION_A_OK:MIDDLEWARE_B` | `/b`          |

In production, a generated route-action manifest lets the RSC handler redispatch the action request through middleware for a page whose graph reaches the action. This example enables manifest routing only in production, so development stays on the current route.

## Application graphs

For simplicity, the app routes and their graph roots are declared manually. Route `/a` reaches action A through a Client Component and an ordinary runtime return value:

```text
src/app/a/page.tsx
  -> client.tsx ("use client")
  -> action-indirect.ts returns actionA
  -> action.tsx ("use server")
```

## Manifest generation

During the RSC build, the manifest plugin traverses each route graph and records directly reachable server reference IDs and reachable Client Component import IDs. During the client build, it traverses the final client graph from those import IDs and records reachable server reference IDs. For each route, it unions the directly reachable IDs with the IDs reachable through its Client Components.

After all environment builds finish, the plugin installs the mapping in the RSC output for runtime routing.

## Request redispatch

For the production scenario above, the RSC handler finds action A under `/a` in the manifest and creates a new action request for `/a`. That request re-enters `/a` middleware, so the action observes `MIDDLEWARE_A`. It also preserves `/b` as the render URL, so the response continues rendering page B.

Development skips route-aware redispatch. The handler executes action A on `/b`, so the action observes `MIDDLEWARE_B`.

## Protocol scope

Hydrated action calls carry an explicit action ID and can be redispatched to a route whose graph reaches the action. Progressive forms normally post back to the route that rendered them, so their multipart `$ACTION_*` fields are instead validated against the current route before `decodeAction()` can load the submitted references. A mismatched progressive action is rejected as stale or manipulated input rather than redispatched.

Route `/c` demonstrates this behavior with unbound and bound progressive forms. Their normal submissions run through `/c` middleware, while replaying the same multipart fields to another route is rejected.

The route manifest is build-time data, so this progressive validation is production-only. Development keeps the baseline `decodeAction()` behavior.
