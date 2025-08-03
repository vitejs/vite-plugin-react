import React, { useState } from 'react'

let callCount = 0

// Create a cached function that should demonstrate React.cache behavior
const cacheFn = React.cache(() => {
  callCount++
  return `Called ${callCount} times`
})

// Create an async cached function for demonstration
const asyncCacheFn = React.cache(async () => {
  await new Promise((r) => setTimeout(r, 10))
  return `Async result`
})

export function ReactCacheTest() {
  const [renderKey, setRenderKey] = useState(0)

  return (
    <div
      className="react-cache-test"
      style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}
    >
      <h3>React.cache Test</h3>
      <div id="react-version">React version: {React.version}</div>
      <div id="react-cache-available">
        React.cache available:{' '}
        {typeof React.cache === 'function' ? 'Yes' : 'No'}
      </div>
      <div id="react-use-available">
        React.use available: {typeof React.use === 'function' ? 'Yes' : 'No'}
      </div>

      <button
        id="cache-test-rerender"
        onClick={() => setRenderKey((k) => k + 1)}
        style={{ padding: '8px 16px', margin: '10px 0' }}
      >
        Force Re-render (count: {renderKey})
      </button>

      <button
        id="cache-test-reset"
        onClick={() => {
          callCount = 0
          setRenderKey((k) => k + 1)
        }}
        style={{ padding: '8px 16px', margin: '10px 0' }}
      >
        Reset Call Count
      </button>

      {/* Test API availability */}
      <ApiAvailabilityTest />

      {/* Test synchronous cache behavior */}
      <SyncCacheTest />

      {/* Test async cache with error boundary */}
      <React.Suspense
        fallback={<div id="cache-loading">Loading async test...</div>}
      >
        <AsyncCacheTest />
      </React.Suspense>
    </div>
  )
}

function ApiAvailabilityTest() {
  let result = 'unknown'
  try {
    const testCache = React.cache(() => 'test')
    result = `Success - created cached function of type: ${typeof testCache}`
  } catch (error) {
    result = `Error: ${error.message}`
  }

  return (
    <div
      id="api-test"
      style={{ padding: '10px', background: '#f0f0f0', margin: '10px 0' }}
    >
      <h4>API Availability Test</h4>
      <div id="api-test-result">Cache creation: {result}</div>
    </div>
  )
}

function SyncCacheTest() {
  // Call the cached function multiple times within the same render
  const result1 = cacheFn()
  const result2 = cacheFn()

  return (
    <div
      id="sync-test"
      style={{ padding: '10px', background: '#e8f4f8', margin: '10px 0' }}
    >
      <h4>Synchronous Cache Test</h4>
      <div id="sync-result1">First call: {result1}</div>
      <div id="sync-result2">Second call: {result2}</div>
      <div id="sync-results-equal">
        Results equal: {result1 === result2 ? 'true' : 'false'}
      </div>
      <div id="sync-call-count">Total function calls: {callCount}</div>
    </div>
  )
}

function AsyncCacheTest() {
  // Use React.use to consume async cached function - don't use try/catch
  const asyncResult = React.use(asyncCacheFn())

  return (
    <div
      id="async-test"
      style={{ padding: '10px', background: '#f0f8e8', margin: '10px 0' }}
    >
      <h4>Async Cache Test</h4>
      <div id="async-result">Async result: {asyncResult}</div>
    </div>
  )
}
