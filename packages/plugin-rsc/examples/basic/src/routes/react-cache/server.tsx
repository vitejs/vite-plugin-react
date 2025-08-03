import React from 'react'

export function TestReactCache() {
  return (
    <>
      <TestReactCacheFn />
      <TestReactCacheComponent />
    </>
  )
}

// Use module-level state but reset it for clean tests
function resetCounters() {
  actionCount = 0
  cacheFnCount = 0
}

function TestReactCacheFn() {
  return (
    <form
      data-testid="test-react-cache-fn"
      action={async (formData) => {
        'use server'
        const reset = formData.get('reset')
        if (reset === 'true') {
          resetCounters()
          return
        }
        actionCount++
        const argument = formData.get('argument') || 'default'
        await testCacheFn(argument)
      }}
    >
      <button>test-react-cache-fn</button>
      <input className="w-25" name="argument" placeholder="argument" />
      <input type="hidden" name="reset" value="false" />
      <span>
        (actionCount: {actionCount}, cacheFnCount: {cacheFnCount})
      </span>
    </form>
  )
}

let actionCount = 0
let cacheFnCount = 0

const testCacheFn = React.cache(async (arg: unknown) => {
  cacheFnCount++
  // Simulate async work
  await new Promise((resolve) => setTimeout(resolve, 20))
  return arg
})

function TestReactCacheComponent() {
  // Similar to the external reference, create a simple demonstration
  const timestamp = new Date().toISOString()

  return (
    <div data-testid="test-react-cache-component">
      <div data-testid="test-react-cache-basic">
        React.cache basic test: {timestamp}
      </div>
      <React.Suspense fallback={<div>Loading...</div>}>
        <TestReactCacheAsyncInner />
      </React.Suspense>
    </div>
  )
}

async function TestReactCacheAsyncInner() {
  // Call cached function - in server components React.cache should work within the same request
  await testCacheFn('constant-arg')
  await testCacheFn('constant-arg') // Should use cache

  return (
    <div data-testid="test-react-cache-async-inner">
      Async inner: cacheFnCount = {cacheFnCount}
    </div>
  )
}
