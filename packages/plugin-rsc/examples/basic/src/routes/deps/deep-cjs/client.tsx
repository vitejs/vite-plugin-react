'use client'

// @ts-ignore
import { TestClient } from '@vitejs/test-dep-deep-cjs/client'

export function TestDeepCjsClient() {
  return (
    <div>
      [test-dep-deep-cjs-client: <TestClient />]
    </div>
  )
}
