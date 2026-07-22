# RSC performance track probe

This example isolates React's Server Components performance tracks from SSR and application framework payloads.

1. From the repository root, run `pnpm override-react canary`, `pnpm install --no-frozen-lockfile`, and `pnpm build`.
2. Run `pnpm dev` in this directory.
3. Open Chrome DevTools and select the Performance panel.
4. Start a normal recording, then manually reload the page while that recording remains active. This ensures tracing starts before React's browser modules load.
5. Let the initial probe resolve, then click **Load RSC probe** to capture the same workload through an on-demand RSC request. After the second probe resolves, wait another second for React's deferred performance flush.
6. Stop recording and inspect the **Server Components** tracks.

Both paths produce a short `DynamicImportComponent` span and a roughly one-second `SlowServerComponent` span. The initial path mirrors a root Suspense workload, while the button isolates a subsequent client-triggered RSC request.

With matching React canary or experimental packages, Chrome records spans for `PerformanceProbe`, `DynamicImportComponent`, `ImportedComponent`, and `SlowServerComponent`. React 19.2.8 produces only the Server Components track markers for this fixture. React's development performance flush is currently flaky, so retry the recording if only markers appear.
