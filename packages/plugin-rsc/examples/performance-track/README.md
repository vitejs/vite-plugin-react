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

Both paths produce a nested pair of `SlowServerComponent` spans. The 500ms inner component only starts after the 300ms outer component resolves, so the two appear as a staircase in the Server Components track instead of overlapping. The initial path uses the normal SSR and injected Flight stream, while client navigation fetches a second RSC payload.

## React compatibility

React 19.2.8 emits timing data but can lose debug information moved from initialized child chunks onto their resolved values. Its performance flush only reads the chunk itself, so Chrome shows track markers without the async component spans. React [fixed this in #34839](https://github.com/facebook/react/pull/34839) by recovering moved debug information from the resolved value during the performance flush.

Waku [applies equivalent recovery](https://github.com/dai-shi/waku/blob/3f88539dfd92aab9aa8db32a390d4eb8b143ee44/packages/waku/src/lib/vite-plugins/patch-rsdw.ts#L3) as a transform for React versions without the fix.

This fixture was verified with matching React packages at `19.3.0-canary-81e442ea-20260721`.
