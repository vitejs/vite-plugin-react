# RSC performance track example

This example isolates React's Server Components performance tracks from SSR and application framework payloads.

1. From the repository root, run `pnpm override-react canary`, `pnpm install --no-frozen-lockfile`, and `pnpm build`.
2. Run `pnpm dev` in this directory.
3. Open Chrome DevTools and select the Performance panel.
4. Start a normal recording, then manually reload the page while that recording remains active. This ensures tracing starts before React's browser modules load.
5. Let the Home page resolve, then follow **About** to capture the same workload through client navigation and an on-demand RSC request. After the About page resolves, wait another second for React's deferred performance flush.
6. Stop recording and inspect the **Server Components** tracks.

Both paths produce a nested pair of `SlowServerComponent` spans. The 500ms inner component only starts after the 300ms outer component resolves, so the two appear as a staircase in the Server Components track instead of overlapping. The initial path uses the normal SSR and injected Flight stream, while client navigation fetches a second ReactNode payload.

With matching React canary or experimental packages, Chrome records spans for `SlowServerComponent`. React 19.2.8 produces only the Server Components track markers for this fixture. React's development performance flush is currently flaky, so retry the recording if only markers appear.
