'use client'

import * as React from 'react'

const BrowserDep = (import.meta.env.SSR ? undefined : React.lazy(() => import('./browser-dep')))!

export function TestBrowserOnly() {
  return (
    <div data-testid="test-browser-only">
      test-browser-only:{' '}
      <BrowserOnly fallback={<>loading...</>}>
        <BrowserDep />
      </BrowserOnly>
    </div>
  )
}

function BrowserOnly(props: React.SuspenseProps) {
  const hydrated = useHydrated()
  if (!hydrated) {
    return props.fallback
  }
  return <React.Suspense {...props} />
}

const noopStore = () => () => {}

const useHydrated = () =>
  React.useSyncExternalStore(
    noopStore,
    () => true,
    () => false,
  )

/*
If we were to implement this whole logic via hypothetical `browserOnly` helper with transform:

======= input ======

const SomeDep = browserOnly(() => import('./some-dep'))

======= output ======

const __TmpLazy = import.meta.env.SSR ? undefined : React.lazy(() => import('./some-dep'}));

const SomeDep = ({ browserOnlyFallback, ...props }) => {
  const hydrated = useHydrated()
  if (!hydrated) {
    return browserOnlyFallback
  }
  return (
    <React.Suspense fallback={browserOnlyFallback}>
      <__TmpLazy {...props} />
    </React.Suspense>
  )
}

=== helper types ===

declare function browserOnly<T>(fn: () => Promise<{ default: React.ComponentType<T> }>):
  React.ComponentType<T & { browserOnlyFallback?: React.ReactNode }>

*/
