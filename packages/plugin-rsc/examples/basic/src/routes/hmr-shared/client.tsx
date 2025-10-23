'use client'

import { TestHmrSharedComponent } from './shared1'
import { testHmrSharedObject } from './shared2'

export function TestHmrSharedClient() {
  return (
    <div data-testid="test-hmr-shared-client">
      test-hmr-shared-client: (<TestHmrSharedComponent />,{' '}
      {testHmrSharedObject.value})
    </div>
  )
}
