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

In production, a generated route-action manifest lets the RSC dispatcher select a deployment whose filtered registry can load the action. The dispatcher also redispatches the request through middleware for a page whose graph reaches the action. This example enables manifest routing only in production, so development stays on the current route.

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

## Route deployments

The final RSC build emits each discovered server-reference module as an explicit chunk entry. Once the client graph completes the route-action relation, a post-build step writes two deployment directories from that canonical output:

```text
dist/rsc/deployments/a
  -> rsc request handler and shared dependencies
  -> rsc filtered server-reference registry
  -> rsc action A entry and dependencies
  -> shared SSR output

dist/rsc/deployments/b
  -> rsc request handler and shared dependencies
  -> rsc filtered server-reference registry
  -> rsc action B entry and dependencies
  -> shared SSR output
```

The deployment handlers use the low-level `@vitejs/plugin-rsc/react/rsc` runtime with `setRequireModule()`. Each registry imports only the emitted server-reference entries selected for that route. This packaging step copies existing chunks and does not run a second bundle.

The canonical `index.js` is a small dispatcher. It routes normal requests by pathname and explicit-ID action requests by the generated manifest, then loads the selected deployment handler. The copied handlers have independent module-local loaders, so explicit `loadServerAction()` calls use the selected filtered registry even though the example runs both deployments in one process.

## Request redispatch

For the production scenario above, the RSC dispatcher finds action A under `/a` in the manifest, creates a new action request for `/a`, and loads deployment A. That request enters `/a` middleware, so the action observes `MIDDLEWARE_A`. It also preserves `/b` as the render URL, so the response continues rendering page B.

Development skips route-aware redispatch. The handler executes action A on `/b`, so the action observes `MIDDLEWARE_B`.

## Protocol scope

For simplicity, route-aware redispatch covers only hydrated action calls that carry an explicit action ID. Progressive multipart form actions still use the baseline `decodeAction()` path without manifest routing.

React's decoder module hook is process-global. Nested server references in action arguments and progressive actions therefore require process isolation or a request-aware decoder integration when multiple deployment handlers run in one process. They are outside this example's explicit-ID deployment proof.
