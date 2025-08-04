import React from 'react'

export async function TestReactCache(props: { url: URL }) {
  if (props.url.searchParams.has('test-react-cache')) {
    await Promise.all([
      testCacheFn('test1'),
      testCacheFn('test2'),
      testCacheFn('test1'),
      testNonCacheFn('test1'),
      testNonCacheFn('test2'),
      testNonCacheFn('test1'),
    ])
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
