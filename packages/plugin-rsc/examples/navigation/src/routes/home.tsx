export function HomePage() {
  return (
    <div className="page">
      <h1>Home Page</h1>
      <p>
        This example demonstrates coordinating browser history navigation with
        React transitions and caching RSC payloads by history entry.
      </p>
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
        <h2>Section 1: Understanding React Server Components</h2>
        <p>
          React Server Components (RSC) represent a new paradigm in React
          applications. They allow you to write components that render on the
          server and stream to the client, reducing bundle size and improving
          initial load performance.
        </p>
        <p>
          Unlike traditional server-side rendering, RSCs can be refetched
          without a full page reload, enabling dynamic updates while maintaining
          the benefits of server rendering.
        </p>
      </div>
      <div className="card">
        <h2>Section 2: Navigation Benefits</h2>
        <p>
          This example showcases how coordinated navigation works with React
          transitions. The key benefits include:
        </p>
        <ul>
          <li>Smooth transitions between pages without full page reloads</li>
          <li>Intelligent caching of previously visited pages</li>
          <li>Proper handling of browser back/forward buttons</li>
          <li>Race condition prevention during rapid navigation</li>
          <li>Loading state management during async transitions</li>
        </ul>
      </div>
      <div className="card">
        <h2>Section 3: Performance Characteristics</h2>
        <p>
          When you navigate to a page for the first time, the RSC payload is
          fetched from the server. This payload is then cached in memory,
          associated with the specific history entry.
        </p>
        <p>
          On subsequent visits via back/forward navigation, the cached payload
          is reused instantly, providing a near-instantaneous page transition.
          This creates a seamless user experience similar to a traditional SPA
          while maintaining the benefits of server rendering.
        </p>
      </div>
      <div className="card">
        <h2>Section 4: Testing Scroll Restoration</h2>
        <p>
          Scroll down this page, then navigate to another page using the links
          in the header. After that, use your browser's back button to return
          here.
        </p>
        <p>
          Notice how the browser automatically restores your scroll position!
          This is native browser behavior that works seamlessly with our
          navigation coordination.
        </p>
      </div>
      <div className="card">
        <h2>Section 5: Implementation Details</h2>
        <p>
          The implementation uses React's <code>startTransition</code> API to
          coordinate navigation updates. This ensures that URL changes and
          content updates happen in sync, preventing jarring UI jumps or
          inconsistent states.
        </p>
        <p>
          The cache is implemented as a simple Map structure, keyed by history
          state IDs. Each navigation creates a unique state ID that persists
          across back/forward navigation, enabling reliable cache lookups.
        </p>
      </div>
      <div className="card">
        <h2>Section 6: Browser History Integration</h2>
        <p>
          Modern browsers provide sophisticated history management APIs. Our
          implementation leverages these APIs to create a seamless navigation
          experience that feels native while using React Server Components.
        </p>
        <p>
          The <code>popstate</code> event handler ensures that back/forward
          navigation is properly detected and handled, coordinating with React's
          rendering cycle to provide smooth transitions.
        </p>
      </div>
      <div className="card">
        <h2>Section 7: Future Enhancements</h2>
        <p>This example can be extended with additional features such as:</p>
        <ul>
          <li>Prefetching pages on link hover for even faster navigation</li>
          <li>Cache size limits and eviction strategies</li>
          <li>Stale-while-revalidate patterns for background updates</li>
          <li>Optimistic UI updates during navigation</li>
          <li>Progress indicators for slow network conditions</li>
        </ul>
      </div>
      <div className="card">
        <h2>Section 8: Bottom of Page</h2>
        <p>
          You've reached the bottom! Now try navigating to the About page or
          Slow Page, then use the browser back button to see scroll restoration
          in action.
        </p>
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.7 }}>
          📍 Scroll position marker - You can use this to verify that your
          scroll position is restored when navigating back to this page.
        </p>
      </div>
    </div>
  )
}
