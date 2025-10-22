# Navigation Example - Coordinating History and Transitions

This example demonstrates how to properly coordinate browser history navigation with React transitions in a React Server Components application.

## Problem

In a typical RSC application with client-side navigation, there's a challenge in coordinating:

1. Browser history changes (pushState/replaceState/popstate)
2. React transitions for smooth updates
3. Asynchronous data fetching
4. Loading state indicators

Without proper coordination, you can encounter:

- URL bar being out of sync with rendered content
- Race conditions with rapid navigation
- Issues with back/forward navigation
- Missing or inconsistent loading indicators

## Solution

This example implements a pattern inspired by Next.js App Router that addresses these issues:

### Key Concepts

1. **Dispatch Pattern**: Uses a dispatch function that coordinates navigation actions with React transitions
2. **Promise-based State**: Navigation state includes a `payloadPromise` that's unwrapped with `React.use()`
3. **useInsertionEffect**: History updates happen via `useInsertionEffect` to ensure they occur after state updates but before paint
4. **Transition Tracking**: Uses `useTransition` to track pending navigation state
5. **Visual Feedback**: Provides a pending indicator during navigation

### Implementation

The core implementation is in `src/framework/entry.browser.tsx`:

```typescript
// Navigation state includes URL, push flag, and payload promise
type NavigationState = {
  url: string
  push?: boolean
  payloadPromise: Promise<RscPayload>
}

// Dispatch coordinates navigation with transitions
dispatch = (action: NavigationAction) => {
  startTransition(() => {
    setState_({
      url: action.url,
      push: action.push,
      payloadPromise: action.payload
        ? Promise.resolve(action.payload)
        : createFromFetch<RscPayload>(fetch(action.url)),
    })
  })
}

// History updates happen via useInsertionEffect
function HistoryUpdater({ state }: { state: NavigationState }) {
  React.useInsertionEffect(() => {
    if (state.push) {
      state.push = false
      oldPushState.call(window.history, {}, '', state.url)
    }
  }, [state])
  return null
}
```

## Running the Example

```bash
pnpm install
pnpm dev
```

Then navigate to http://localhost:5173

## What to Try

1. **Basic Navigation**: Click between pages and notice the smooth transitions
2. **Slow Page**: Visit the "Slow Page" to see how loading states work with delays
3. **Rapid Navigation**: Click links rapidly to see that race conditions are prevented
4. **Back/Forward**: Use browser back/forward buttons to see proper coordination
5. **Counter Page**: See how client and server state interact with navigation

## References

This pattern is based on:

- [Next.js App Router](https://github.com/vercel/next.js/blob/main/packages/next/src/client/components/app-router.tsx)
- [Next.js Action Queue](https://github.com/vercel/next.js/blob/main/packages/next/src/client/components/use-action-queue.ts)
- [React useTransition](https://react.dev/reference/react/useTransition)
- [React.use](https://react.dev/reference/react/use)

## Related

- GitHub Issue: https://github.com/vitejs/vite-plugin-react/issues/860
- Reproduction: https://github.com/hi-ogawa/reproductions/tree/main/vite-rsc-coordinate-history-and-transition
