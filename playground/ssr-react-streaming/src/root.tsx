import * as React from 'react'

export function Root() {
  return (
    <html>
      <head>
        <title>Streaming</title>
      </head>
      <body>
        <h4>Streaming</h4>
        <TestSuspense />
        <Hydrated />
        <Counter />
      </body>
    </html>
  )
}

function Counter() {
  const [count, setCount] = React.useState(0)
  return (
    <button data-testid="counter" onClick={() => setCount((c) => c + 1)}>
      Counter: {count}
    </button>
  )
}

function Hydrated() {
  const hydrated = React.useSyncExternalStore(
    React.useCallback(() => () => {}, []),
    () => true,
    () => false,
  )
  return <div data-testid="hydrated">[hydrated: {hydrated ? 1 : 0}]</div>
}

function TestSuspense() {
  const context = React.useState(() => ({}))[0]
  return (
    <div data-testid="suspense">
      <React.Suspense fallback={<div>suspense-fallback</div>}>
        <Sleep context={context} />
      </React.Suspense>
    </div>
  )
}

// use weak map to suspend for each server render
const sleepPromiseMap = new WeakMap<object, Promise<void>>()

function Sleep(props: { context: object }) {
  if (typeof document !== 'undefined') {
    return <div>suspense-resolved</div>
  }
  if (!sleepPromiseMap.has(props.context)) {
    sleepPromiseMap.set(props.context, new Promise((r) => setTimeout(r, 1000)))
  }
  React.use(sleepPromiseMap.get(props.context))
  return <div>suspense-resolved</div>
}
