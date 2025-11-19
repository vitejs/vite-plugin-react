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
    </div>
  )
}
