import { TestClient } from './client'
import ErrorBoundary from './error-boundary'
import { testShared } from './shared'

export function TestHmrSharedAtomic() {
  return (
    <div>
      test-hmr-shared-atomic:{' '}
      <ErrorBoundary>
        <TestClient testSharedFromServer={testShared} />
      </ErrorBoundary>
    </div>
  )
}
