/**
 * This page simulates a slow server response to demonstrate
 * the navigation transition coordination.
 */
export async function SlowPage(props: { url: URL }) {
  const delay = Number(props.url.searchParams.get('delay')) || 500

  // Simulate slow server response
  await new Promise((resolve) => setTimeout(resolve, delay))

  return (
    <div className="page">
      <h1>Slow Page</h1>
      <p>
        This page simulates a slow server response (delay: {delay}ms) to
        demonstrate the navigation transition coordination.
      </p>
      <div className="card">
        <h2>What to notice:</h2>
        <ul>
          <li>The "pending..." indicator appears while the page is loading</li>
          <li>The URL updates immediately when the transition starts</li>
          <li>The page content doesn't change until the new data is ready</li>
          <li>
            If you click another link while this is loading, the navigation is
            properly coordinated
          </li>
        </ul>
      </div>
      <div className="card">
        <h2>Try different delays:</h2>
        <div className="button-group">
          <a href="/slow?delay=500" className="button">
            500ms
          </a>
          <a href="/slow?delay=1000" className="button">
            1s
          </a>
          <a href="/slow?delay=2000" className="button">
            2s
          </a>
          <a href="/slow?delay=3000" className="button">
            3s
          </a>
        </div>
      </div>
      <div className="card">
        <h2>Page loaded at:</h2>
        <p>
          <strong>{new Date().toLocaleTimeString()}</strong>
        </p>
      </div>
      <div className="card">
        <h2>Section 1: Simulating Network Conditions</h2>
        <p>
          This page intentionally delays its response to simulate slow network
          conditions or heavy server-side processing. In real applications, you
          might encounter similar delays when:
        </p>
        <ul>
          <li>Fetching data from slow external APIs</li>
          <li>Running complex database queries</li>
          <li>Processing large amounts of data on the server</li>
          <li>Dealing with high server load</li>
        </ul>
      </div>
      <div className="card">
        <h2>Section 2: Transition Coordination</h2>
        <p>
          During the loading period, React's transition system keeps the current
          page visible while preparing the new one. This prevents showing a
          blank screen or jarring layout shifts.
        </p>
        <p>
          The "pending..." indicator in the navigation shows that a transition
          is in progress, giving users clear feedback about the application
          state.
        </p>
      </div>
      <div className="card">
        <h2>Section 3: Race Condition Prevention</h2>
        <p>
          Try clicking rapidly between different delay options. Notice that even
          if you click multiple links quickly, the navigation system properly
          handles the race conditions.
        </p>
        <p>
          The most recent navigation always wins, and previous pending
          navigations are automatically cancelled. This prevents outdated
          content from appearing after a newer navigation has started.
        </p>
      </div>
      <div className="card">
        <h2>Section 4: Cache Behavior with Slow Pages</h2>
        <p>
          Here's something interesting: Even though this page takes time to load
          initially, once it's cached, it loads instantly when you navigate back
          using the browser back button.
        </p>
        <p>
          Try it: navigate to another page, then click back. The previously slow
          page now appears immediately because it's served from cache!
        </p>
      </div>
      <div className="card">
        <h2>Section 5: Loading State Management</h2>
        <p>
          The loading state is managed at the framework level, coordinating
          between:
        </p>
        <ul>
          <li>The URL state (updates immediately)</li>
          <li>The visual loading indicator (shows during fetch)</li>
          <li>The content transition (waits for data)</li>
          <li>The history entry (created at the right time)</li>
        </ul>
        <p>
          This coordination ensures a consistent user experience even with
          varying network conditions.
        </p>
      </div>
      <div className="card">
        <h2>Section 6: User Experience Patterns</h2>
        <p>
          In production applications, you might want to add additional UX
          enhancements for slow loading scenarios:
        </p>
        <ul>
          <li>Skeleton screens to show expected layout</li>
          <li>Progress bars for long operations</li>
          <li>Cancel buttons for user-initiated aborts</li>
          <li>Timeout handling with retry mechanisms</li>
          <li>Offline detection and appropriate messaging</li>
        </ul>
      </div>
      <div className="card">
        <h2>Section 7: Scroll Position Testing</h2>
        <p>
          Scroll down to this section and note your position. Then navigate away
          and come back using the browser back button.
        </p>
        <p>
          Even though this page initially took time to load, when you return via
          back navigation, it not only loads instantly from cache but also
          restores your exact scroll position!
        </p>
      </div>
      <div className="card">
        <h2>Section 8: Performance Optimization</h2>
        <p>In real applications, you'd want to optimize slow operations by:</p>
        <ul>
          <li>Using database indexes for faster queries</li>
          <li>Implementing server-side caching (Redis, Memcached)</li>
          <li>Optimizing API calls with batching or GraphQL</li>
          <li>Using CDNs for static assets</li>
          <li>Implementing request deduplication</li>
        </ul>
      </div>
      <div className="card">
        <h2>Section 9: Bottom of Slow Page</h2>
        <p>
          You've scrolled to the bottom! The timestamp above shows when this
          page was initially loaded. Try different delay values to see how the
          system handles various loading times.
        </p>
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.7 }}>
          📍 End marker - Perfect spot to test scroll restoration!
        </p>
      </div>
    </div>
  )
}
