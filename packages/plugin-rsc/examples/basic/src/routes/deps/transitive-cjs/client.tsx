'use client'

// @ts-ignore
import { TestClient } from '@vitejs/test-dep-transitive-cjs/client'

// @ts-ignore
import { TestClient as TestClient2 } from '@vitejs/test-dep-transitive-use-sync-external-store/client'

export function TestTransitiveCjsClient() {
  return (
    <>
      <div>
        [test-dep-transitive-cjs-client: <TestClient />]
      </div>
      <div>
        [test-dep-transitive-use-sync-external-store-client: <TestClient2 />]
      </div>
    </>
  )
}
