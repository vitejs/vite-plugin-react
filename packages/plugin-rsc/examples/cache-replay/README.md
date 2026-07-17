# Persisted Flight server reference replay

This example persists a Flight payload containing a server reference and compares the default replay, which imports the server action in the RSC environment, with a replay that preserves the reference. With preservation enabled, the action is imported only when the replayed form invokes it.

The framework files follow the starter example. The application routes own persistence and replay, while the framework only performs its normal request parsing, action handling, and RSC serialization.

## Development manual test

Start the first process:

```bash
pnpm dev
```

1. Visit `http://localhost:5173/cache` and confirm the action is imported.
2. Stop the development server without changing the source graph.
3. Run `pnpm dev` again.
4. Visit `http://localhost:5173/read-cache`, then visit the home page and confirm the action is imported.
5. Restart the development server again.
6. Visit `http://localhost:5173/read-cache-preserve`, then visit the home page and confirm the action is not imported.
7. Return to `http://localhost:5173/read-cache-preserve`.
8. Select **Invoke action** and confirm the action is imported and invoked.

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
5. Visit `http://localhost:4173/read-cache`, then visit the home page and confirm the action is imported.
6. Restart the preview server again without rebuilding.
7. Visit `http://localhost:4173/read-cache-preserve`, then visit the home page and confirm the action is not imported.
8. Return to `http://localhost:4173/read-cache-preserve`.
9. Select **Invoke action** and confirm the action is imported and invoked.

The same production build must be used for both processes because the persisted Flight payload contains build-specific server-reference IDs.

Delete `.flight-cache` to reset the example.
