'use client'

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
      data-testid="react-cache-test"
    >
      <h3>React.cache Test</h3>
      <div data-testid="react-version">React version: {React.version}</div>
      <div data-testid="react-cache-available">
        React.cache available:{' '}
        {typeof React.cache === 'function' ? 'Yes' : 'No'}
      </div>
      <div data-testid="react-use-available">
        React.use available: {typeof React.use === 'function' ? 'Yes' : 'No'}
      </div>

      <button
        data-testid="cache-test-rerender"
        onClick={() => setRenderKey((k) => k + 1)}
        style={{ padding: '8px 16px', margin: '10px 0' }}
      >
        Force Re-render (count: {renderKey})
      </button>

      <button
        data-testid="cache-test-reset"
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
        fallback={<div data-testid="cache-loading">Loading async test...</div>}
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
      data-testid="api-test"
      style={{ padding: '10px', background: '#f0f0f0', margin: '10px 0' }}
    >
      <h4>API Availability Test</h4>
      <div data-testid="api-test-result">Cache creation: {result}</div>
    </div>
  )
}

function SyncCacheTest() {
  // Call the cached function multiple times within the same render
  const result1 = cacheFn()
  const result2 = cacheFn()

  return (
    <div
      data-testid="sync-test"
      style={{ padding: '10px', background: '#e8f4f8', margin: '10px 0' }}
    >
      <h4>Synchronous Cache Test</h4>
      <div data-testid="sync-result1">First call: {result1}</div>
      <div data-testid="sync-result2">Second call: {result2}</div>
      <div data-testid="sync-results-equal">
        Results equal: {result1 === result2 ? 'true' : 'false'}
      </div>
      <div data-testid="sync-call-count">Total function calls: {callCount}</div>
    </div>
  )
}

function AsyncCacheTest() {
  // Use React.use to consume async cached function - don't use try/catch
  const asyncResult = React.use(asyncCacheFn())

  return (
    <div
      data-testid="async-test"
      style={{ padding: '10px', background: '#f0f8e8', margin: '10px 0' }}
    >
      <h4>Async Cache Test</h4>
      <div data-testid="async-result">Async result: {asyncResult}</div>
    </div>
  )
}