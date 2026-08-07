import { UseCacheInUseServerFromClient } from './client'
import { state } from './state'

export function UseCacheInUseServerFromClientServer() {
  return (
    <UseCacheInUseServerFromClient
      defaultExecutions={state.defaultExecutions}
      overrideExecutions={state.overrideExecutions}
    />
  )
}
