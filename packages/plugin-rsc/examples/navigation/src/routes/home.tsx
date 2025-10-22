export function HomePage() {
  return (
    <div className="page">
      <h1>Home Page</h1>
      <p>
        This example demonstrates coordinating browser history navigation with
        React transitions.
      </p>
      <div className="card">
        <h2>Key Features</h2>
        <ul>
          <li>
            <strong>Coordinated Updates:</strong> History updates happen via{' '}
            <code>useInsertionEffect</code> after state updates but before paint
          </li>
          <li>
            <strong>Transition Tracking:</strong> Uses{' '}
            <code>useTransition</code> to track navigation state
          </li>
          <li>
            <strong>Promise-based State:</strong> Navigation state includes a{' '}
            <code>payloadPromise</code> unwrapped with <code>React.use()</code>
          </li>
          <li>
            <strong>Visual Feedback:</strong> A pending indicator appears during
            navigation
          </li>
          <li>
            <strong>Race Condition Prevention:</strong> Proper coordination
            prevents issues with rapid navigation
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
          Notice the "pending..." indicator in the bottom right during
          navigation. Try clicking links rapidly or using the browser
          back/forward buttons.
        </p>
      </div>
      <div className="card">
        <h2>Implementation Details</h2>
        <p>
          This pattern is inspired by Next.js App Router and addresses common
          issues with client-side navigation in React Server Components:
        </p>
        <ul>
          <li>
            The URL bar and rendered content stay in sync during transitions
          </li>
          <li>Back/forward navigation properly coordinates with React</li>
          <li>Multiple rapid navigations don't cause race conditions</li>
          <li>Loading states are properly managed</li>
        </ul>
        <p className="code-ref">
          See <code>src/framework/entry.browser.tsx</code> for the
          implementation.
        </p>
      </div>
    </div>
  )
}
