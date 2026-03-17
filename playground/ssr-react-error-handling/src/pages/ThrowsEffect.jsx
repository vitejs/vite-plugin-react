import React from 'react'

/**
 * A component that throws inside a useEffect.
 *
 * Since useEffect does not run during SSR, this page renders successfully
 * on the server. The error only surfaces on the client, where it is caught
 * by the nearest ErrorBoundary.
 *
 * This pattern is common when server-rendered content is valid but a
 * client-side side effect (e.g. a broken API call or a missing browser
 * API) fails after hydration.
 */
export default function ThrowsEffect() {
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    // Simulate a client-only failure (e.g. a broken fetch or missing API)
    setReady(true)
  }, [])

  if (ready) {
    throw new Error('Intentional effect error (client-only)')
  }

  return (
    <>
      <h1>Throws in Effect</h1>
      <p>This page renders on the server but throws on the client.</p>
    </>
  )
}
