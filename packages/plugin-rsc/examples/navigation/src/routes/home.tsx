export function HomePage() {
  return (
    <div className="page">
      <h1>Home Page</h1>
      <p>
        This example demonstrates coordinating browser history navigation with
        React transitions and caching RSC payloads by history entry.
      </p>
      <div className="card">
        <h2>Key Features</h2>
        <ul>
          <li>
            <strong>Instant Back/Forward:</strong> Cache keyed by history state
            means back/forward navigation is instant with no loading state
          </li>
          <li>
            <strong>Coordinated Updates:</strong> History updates happen via{' '}
            <code>useInsertionEffect</code> after state updates but before paint
          </li>
          <li>
            <strong>Smart Caching:</strong> Each history entry gets a unique
            key, cache is per-entry not per-URL
          </li>
          <li>
            <strong>Transition Tracking:</strong> Uses{' '}
            <code>useTransition</code> to track navigation state (only for cache
            misses)
          </li>
          <li>
            <strong>Promise-based State:</strong> Navigation state includes a{' '}
            <code>payloadPromise</code> unwrapped with <code>React.use()</code>
          </li>
          <li>
            <strong>Cache Invalidation:</strong> Server actions update cache for
            current entry
          </li>
        </ul>
      </div>
      <div className="card">
        <h2>Try it out</h2>
        <p>
          Click the navigation links above to see the coordinated navigation in
          action:
        </p>
        <ul>
          <li>
            <a href="/about">About</a> - A regular page
          </li>
          <li>
            <a href="/slow">Slow Page</a> - Simulates a slow server response
          </li>
          <li>
            <a href="/counter">Counter</a> - A page with server and client state
          </li>
        </ul>
        <p>
          <strong>Notice the cache behavior:</strong>
        </p>
        <ul>
          <li>
            First visit to a page shows "loading..." indicator (cache miss)
          </li>
          <li>Navigate to another page, then use browser back button</li>
          <li>
            No loading indicator! The page renders instantly from cache (cache
            hit)
          </li>
          <li>
            Even the slow page is instant on back/forward after first visit
          </li>
        </ul>
      </div>
      <div className="card">
        <h2>How the Cache Works</h2>
        <p>The cache is keyed by history entry, not URL:</p>
        <ol>
          <li>
            Each <code>history.state</code> gets a unique random{' '}
            <code>key</code>
          </li>
          <li>
            Cache maps <code>key → Promise&lt;RscPayload&gt;</code>
          </li>
          <li>On navigation, check if current history state key is in cache</li>
          <li>
            Cache hit → return existing promise → <code>React.use()</code>{' '}
            unwraps synchronously → instant render!
          </li>
          <li>
            Cache miss → fetch from server → shows loading state → cache result
          </li>
        </ol>
        <p>
          This means visiting the same URL at different times creates different
          cache entries. Perfect for back/forward navigation!
        </p>
      </div>
      <div className="card">
        <h2>Implementation Details</h2>
        <p>
          This pattern addresses common issues with client-side navigation in
          React Server Components:
        </p>
        <ul>
          <li>
            The URL bar and rendered content stay in sync during transitions
          </li>
          <li>
            Back/forward navigation is instant via cache (no unnecessary
            fetches)
          </li>
          <li>Server actions invalidate cache for current entry</li>
          <li>Browser handles scroll restoration automatically</li>
          <li>Loading states only show for actual fetches (cache misses)</li>
        </ul>
        <p className="code-ref">
          See <code>src/framework/entry.browser.tsx</code> for the
          implementation.
        </p>
      </div>
    </div>
  )
}
