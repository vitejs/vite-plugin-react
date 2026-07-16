# Persisted Flight server reference replay

This example persists a Flight payload containing a server reference, restarts the server, and replays the payload without importing the server action in the RSC environment. The action is imported only when the replayed form invokes it.

The example intentionally uses a native form without JavaScript so the final step exercises `decodeAction`.

## Development manual test

Start the first process:

```bash
pnpm dev
```

1. Visit `http://localhost:5173/cache` and confirm the page displays `true`.
2. Stop the development server without changing the source graph.
3. Run `pnpm dev` again.
4. Visit `http://localhost:5173/` and confirm the page displays `false`.
5. Select **Invoke replayed action** and confirm the response displays `true`.

The source graph must remain unchanged across the restart so its development server-reference IDs remain stable.

## Production manual test

Build the example once:

```bash
pnpm build
```

Start the first process:

```bash
pnpm preview
```

1. Visit `http://localhost:4173/cache`.
2. Confirm the page displays `Action imported in the RSC environment: true`.
3. Stop the preview server without rebuilding.
4. Run `pnpm preview` again.
5. Visit `http://localhost:4173/` and confirm the page displays `false`.
6. Select **Invoke replayed action** and confirm the response displays `true`.

The same production build must be used for both processes because the persisted Flight payload contains build-specific server-reference IDs.

Delete `.flight-cache` to reset the example.
