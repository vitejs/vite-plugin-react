import { TestContextValueIndirect } from './client'
// @ts-ignore
import { TestClientInServerDep } from '@vitejs/test-dep-client-in-server/server'
// @ts-ignore
import { TestContextProviderInServer } from '@vitejs/test-dep-client-in-server2/server'

export function TestClientInServer() {
  return (
    <div>
      <div data-testid="client-in-server">
        [test-client-in-server-dep: <TestClientInServerDep />]
      </div>
      <div data-testid="provider-in-server">
        [test-provider-in-server-dep:{' '}
        <TestContextProviderInServer value={true}>
          <TestContextValueIndirect />
        </TestContextProviderInServer>
        ]
      </div>
    </div>
  )
}
