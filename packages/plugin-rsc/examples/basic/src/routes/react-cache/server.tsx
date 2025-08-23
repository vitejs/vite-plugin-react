import React from 'react'

// Note that `React.cache` doesn't have effect inside action
// since it's outside of RSC render request context.
// https://github.com/hi-ogawa/reproductions/tree/main/next-rsc-action-cache

export async function TestReactCache(props: { url: URL }) {
  if (props.url.searchParams.has('test-react-cache')) {
    await testCacheFn('test1')
    await testCacheFn('test2')
    await testCacheFn('test1')
    await testNonCacheFn('test1')
    await testNonCacheFn('test2')
    await testNonCacheFn('test1')
  } else {
    cacheFnCount = 0
    nonCacheFnCount = 0
  }

  return (
    <div data-testid="test-react-cache">
      <a href="?test-react-cache">test-react-cache</a>{' '}
      <span data-testid="test-react-cache-result">
        (cacheFnCount = {cacheFnCount}, nonCacheFnCount = {nonCacheFnCount})
      </span>
    </div>
  )
}

let cacheFnCount = 0
let nonCacheFnCount = 0

const testCacheFn = React.cache(async (...args: unknown[]) => {
  console.log('[cached:args]', args)
  cacheFnCount++
  await new Promise((resolve) => setTimeout(resolve, 20))
})

const testNonCacheFn = async (...args: unknown[]) => {
  console.log('[not-cached:args]', args)
  nonCacheFnCount++
  await new Promise((resolve) => setTimeout(resolve, 20))
}
