import ErrorBoundary from './error-boundary'

// see browser console to verify that server action error shows
// server component stack with correct source map

export function TestServerActionError() {
  return (
    <ErrorBoundary>
      <form
        action={async () => {
          'use server'
          throw new Error('boom!')
        }}
      >
        <button>test-server-action-error</button>
      </form>
    </ErrorBoundary>
  )
}
