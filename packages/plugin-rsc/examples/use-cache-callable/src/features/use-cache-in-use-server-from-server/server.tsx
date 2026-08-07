import { defaultAction, overrideAction, resetAction } from './actions'
import { UseCacheInUseServerFromServer } from './client'
import { state } from './state'

export function UseCacheInUseServerFromServerServer() {
  return (
    <UseCacheInUseServerFromServer
      defaultAction={defaultAction}
      defaultExecutions={state.defaultExecutions}
      overrideAction={overrideAction}
      overrideExecutions={state.overrideExecutions}
      resetAction={resetAction}
    />
  )
}
