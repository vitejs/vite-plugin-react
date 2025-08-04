import { TestHmrSharedComponent } from './shared1'
import { testHmrSharedObject } from './shared2'

export function TestHmrSharedServer() {
  return (
    <div>
      test-hmr-shared-server: (<TestHmrSharedComponent />,{' '}
      {testHmrSharedObject.value})
    </div>
  )
}
