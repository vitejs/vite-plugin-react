# Navigation Example - Coordinating History, Transitions, and Caching

TODO: review

This example demonstrates how to properly coordinate Browser URL update with React transitions and implement instant back/forward navigation via caching in a React Server Components application.

## Problem

In a typical RSC application with client-side navigation, there's a challenge in coordinating:

1. Browser history changes (pushState/replaceState/popstate)
2. React transitions for smooth updates
3. Asynchronous data fetching
4. Loading state indicators
5. Back/forward navigation performance

Without proper coordination, you can encounter:

- URL bar being out of sync with rendered content
- Slow back/forward navigation (refetching from server)
- Issues with cache invalidation after mutations
- Missing or inconsistent loading indicators

## Solution

This example implements a caching pattern that addresses these issues:

### Key Concepts

1. **Modern Navigation API**: Uses [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) when available, falls back to History API
2. **Back/Forward Cache by Entry**: Each navigation entry gets a unique key, cache maps `key → Promise<RscPayload>`
3. **Instant Navigation**: Cache hits render synchronously (no loading state), cache misses show transitions
4. **Dispatch Pattern**: Uses a dispatch function that coordinates navigation actions with React transitions
5. **Promise-based State**: Navigation state includes a `payloadPromise` that's unwrapped with `React.use()`
6. **Cache Invalidation**: Server actions update cache for current entry

### Browser Compatibility

The implementation automatically detects and uses:

- **Navigation API** (Chrome 102+, Edge 102+): Modern, cleaner API with built-in entry keys
- **History API** (all browsers): Fallback for older browsers, requires manual key management

No configuration needed - feature detection happens automatically!

### Implementation

The core implementation is in `src/framework/navigation.ts`:

```typescript
// Feature detection
const supportsNavigationAPI = 'navigation' in window

// Navigation API: Clean, modern
private listenNavigationAPI(): () => void {
  const onNavigate = (e: NavigateEvent) => {
    if (!e.canIntercept) return

    e.intercept({
      handler: async () => {
        this.navigate(url.href)
      },
    })
  }
  window.navigation.addEventListener('navigate', onNavigate)
  return () => window.navigation.removeEventListener('navigate', onNavigate)
}

// History API fallback: Works everywhere
private listenHistoryAPI(): () => void {
  window.history.pushState = (...args) => {
    args[0] = this.addStateKey(args[0])
    this.oldPushState.apply(window.history, args)
    this.navigate(url.href)
  }
  // ... popstate, replaceState, link clicks
}

// Dispatch coordinates navigation with transitions and cache
dispatch = (action: NavigationAction) => {
  startTransition(() => {
    setState_({
      url: action.url,
      push: action.push,
      payloadPromise: action.payload
        ? Promise.resolve(action.payload)
        : bfCache.run(() => createFromFetch<RscPayload>(fetch(action.url))),
    })
  })
}

// Each history entry gets a unique key
function addStateKey(state: any): HistoryState {
  const key = Math.random().toString(36).slice(2)
  return { ...state, key }
}
```

**Why this works:**

- `React.use()` can unwrap both promises AND resolved values
- Cache hit → returns existing promise → `React.use()` unwraps synchronously → instant render, no transition!
- Cache miss → creates new fetch promise → `React.use()` suspends → shows loading, transition active
- Browser automatically handles scroll restoration via proper history state

## Running the Example

```bash
pnpm install
pnpm dev
```

Then navigate to http://localhost:5173

## What to Try

1. **Cache Behavior**:
   - Visit "Slow Page" (notice the loading indicator)
   - Navigate to another page
   - Click browser back button
   - Notice: No loading indicator! Instant render from cache

2. **Cache Miss vs Hit**:
   - First visit to any page shows "loading..." (cache miss)
   - Back/forward to visited pages is instant (cache hit)
   - Even slow pages are instant on second visit

3. **Server Actions**:
   - Go to "Counter Page" and increment server counter
   - Notice the cache updates for current entry
   - Navigate away and back to see updated state

4. **Scroll Restoration**: Browser handles this automatically via proper history state

## References

This pattern is inspired by:

- [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) - Modern navigation standard
- [hi-ogawa/vite-environment-examples](https://github.com/hi-ogawa/vite-environment-examples/blob/main/examples/react-server/src/features/router/browser.ts) - Back/forward cache implementation
- [TanStack Router](https://github.com/TanStack/router/blob/main/packages/history/src/index.ts) - History state key pattern
- [React useTransition](https://react.dev/reference/react/useTransition)
- [React.use](https://react.dev/reference/react/use)

## Related

- GitHub Issue: https://github.com/vitejs/vite-plugin-react/issues/860
- Reproduction: https://github.com/hi-ogawa/reproductions/tree/main/vite-rsc-coordinate-history-and-transition
