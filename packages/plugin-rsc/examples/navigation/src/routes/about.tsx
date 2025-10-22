export function AboutPage() {
  return (
    <div className="page">
      <h1>About</h1>
      <p>
        This is a React Server Component rendered on the server and streamed to
        the client.
      </p>
      <div className="card">
        <h2>Navigation Coordination</h2>
        <p>
          When you navigate between pages, the navigation is coordinated with
          React transitions to ensure:
        </p>
        <ol>
          <li>The URL updates at the right time</li>
          <li>Loading states are properly displayed</li>
          <li>Race conditions are prevented</li>
          <li>Back/forward navigation works correctly</li>
        </ol>
      </div>
      <div className="card">
        <h2>Current Time</h2>
        <p>
          This page was rendered on the server at:{' '}
          <strong>{new Date().toLocaleTimeString()}</strong>
        </p>
        <p>
          Navigate away and back to see the time update, demonstrating that the
          page is re-rendered on the server each time.
        </p>
      </div>
    </div>
  )
}
