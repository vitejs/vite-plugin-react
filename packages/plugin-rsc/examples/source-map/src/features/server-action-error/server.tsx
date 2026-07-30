import { ActionErrorBoundary } from './error-boundary'

export function ServerActionError() {
  return (
    <section>
      <h2>Server Action error</h2>
      <ActionErrorBoundary>
        <form
          action={async () => {
            'use server'
            throw new Error('server-action-source-map')
          }}
        >
          <button>Throw Server Action error</button>
        </form>
      </ActionErrorBoundary>
    </section>
  )
}
