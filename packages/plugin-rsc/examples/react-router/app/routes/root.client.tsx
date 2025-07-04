'use client'

import { useNavigation, useRouteError } from 'react-router'

export function GlobalNavigationLoadingBar() {
  const navigation = useNavigation()

  if (navigation.state === 'idle') return null

  return (
    <div className="h-1 w-full bg-pink-100 overflow-hidden fixed top-0 left-0 z-50 opacity-50">
      <div className="animate-progress origin-[0%_50%] w-full h-full bg-pink-500" />
    </div>
  )
}

export function DumpError() {
  const error = useRouteError()
  const message =
    error instanceof Error ? (
      <div>
        <pre>
          {JSON.stringify(
            {
              ...error,
              name: error.name,
              message: error.message,
            },
            null,
            2,
          )}
        </pre>
        {error.stack && <pre>{error.stack}</pre>}
      </div>
    ) : (
      <div>Unknown Error</div>
    )
  return (
    <>
      <h1>Oooops</h1>
      <pre>{message}</pre>
    </>
  )
}
