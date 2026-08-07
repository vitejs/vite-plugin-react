import { UseCacheInUseServerClient } from './client'
import { state } from './state'

export function UseCacheInUseServer() {
  return (
    <UseCacheInUseServerClient
      defaultExecutions={state.defaultExecutions}
      overrideExecutions={state.overrideExecutions}
    />
  )
}
