# Persisted Flight server reference replay

This example persists a Flight payload containing a server reference and compares the default replay, which imports the server action in the RSC environment, with a replay that preserves the reference. With preservation enabled, the action is imported only when the replayed form invokes it.

The framework files follow the starter example. The application routes own persistence and replay, while the framework only performs its normal request parsing, action handling, and RSC serialization.

## Manual test

Start the development server:

```bash
pnpm dev
```

Alternatively, build once and start the production server:

```bash
pnpm build
pnpm preview
```

1. Visit `/cache` and confirm the action is imported.
2. Stop and restart the server with `pnpm dev` or `pnpm preview`.
3. Visit `/read-cache`, then visit `/` and confirm the action is imported.
4. Restart the server again.
5. Visit `/read-cache-preserve`, then visit `/` and confirm the action is not imported.
6. Return to `/read-cache-preserve`.
7. Select **Invoke action** and confirm the action is imported and invoked.

Do not change the source graph between development server restarts or rebuild between production server restarts. The persisted Flight payload contains server-reference IDs that must remain stable.

Delete `.flight-cache` to reset the example.
