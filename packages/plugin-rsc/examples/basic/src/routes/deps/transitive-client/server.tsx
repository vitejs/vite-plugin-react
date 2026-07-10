// @ts-ignore
import { TestServerWithTransitiveClientDep } from '@vitejs/test-dep-server-with-transitive-client/server'

export function TestTransitiveClient() {
  return (
    <div data-testid="transitive-client">
      [test-transitive-client-dep: <TestServerWithTransitiveClientDep />]
    </div>
  )
}
