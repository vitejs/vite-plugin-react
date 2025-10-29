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
    </div>
  )
}
