# Cross-Environment Action Reachability

This example isolates a server reference that crosses a Client Component boundary through an ordinary JavaScript object:

```text
root.tsx
  -> client-form.tsx ("use client")
  -> commands.tsx
  -> action.tsx ("use server")
```

The client can invoke `commands.objectWrappedAction`, even though import/export binding analysis cannot infer that the `commands` object carries the server reference.

The framework plugin calls plugin-RSC's experimental `manager.getClientToServerReferenceReachability(this)` method during its final client `generateBundle` hook and writes the result to `dist/client/reference-reachability.json`. It demonstrates that final client module-graph traversal connects `client-form.tsx` to `objectWrappedAction` without parsing local JavaScript value flow.
