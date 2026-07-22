# RSC performance track example

This example isolates React's Server Components performance tracks from SSR and application framework payloads.

## Demo

<img width="500" alt="Performance track example" src="https://github.com/user-attachments/assets/26e39e81-280e-4df5-9d44-e69b67980017" />

<img width="500" alt="Server Components performance track" src="https://github.com/user-attachments/assets/27327a73-c93d-4c75-ae3e-60b77fc29f90" />

1. From the repository root, run `pnpm override-react canary`, `pnpm install --no-frozen-lockfile`, and `pnpm build`.
2. Run `pnpm dev` in this directory.
3. Open Chrome DevTools and select the Performance panel.
4. Select **Record and reload**.
5. Let the Home page resolve, then follow **About** to capture the same workload through client navigation and an on-demand RSC request. After the About page resolves, wait another second for React's deferred performance flush.
6. Stop recording and inspect the **Server Components** tracks.

Both paths produce a nested pair of `SlowServerComponent` spans. The 500ms inner component only starts after the 300ms outer component resolves, so the two appear as a staircase in the Server Components track instead of overlapping. The initial path uses the normal SSR and injected Flight stream, while client navigation fetches a second ReactNode payload.

## Payload shape

This fixture intentionally exports `RscPayload = ReactNode` and serializes a top-level React element. React's canary client can recover moved performance debug information from supported renderable root values. Frameworks that move this information into an arbitrary object or a derived promise may need to preserve React's internal `_debugInfo` themselves.

Waku [extends the recovery logic](https://github.com/dai-shi/waku/blob/3f88539dfd92aab9aa8db32a390d4eb8b143ee44/packages/waku/src/lib/vite-plugins/patch-rsdw.ts#L3) for its plain-object payload. Next.js [propagates `_debugInfo`](https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/client/components/router-reducer/ppr-navigations.ts#L2250) onto framework-created promises. These are framework-specific integration details rather than requirements of `@vitejs/plugin-rsc` or the RSC protocol.

This fixture was verified with matching React packages at `19.3.0-canary-81e442ea-20260721`. React 19.2.8 emits timing data but loses moved debug information during the client performance flush, so Chrome shows track markers without component spans. See React's [debug-info recovery logic](https://github.com/facebook/react/blob/b740af2510de1e19fcb399abb862af26ff95ac80/packages/react-client/src/ReactFlightClient.js#L4518-L4535).
