'use client'

// @ts-ignore
import { TestClient } from '@vitejs/test-dep-transitive-cjs/client'

export function TestTransitiveCjsClient() {
  return (
    <div>
      [test-dep-transitive-cjs-client: <TestClient />]
    </div>
  )
}
