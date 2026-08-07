import { UseServerInUseCacheClient } from './client'
import { state } from './state'

export function UseServerInUseCache() {
  return (
    <UseServerInUseCacheClient
      defaultExecutions={state.defaultExecutions}
      overrideExecutions={state.overrideExecutions}
    />
  )
}
