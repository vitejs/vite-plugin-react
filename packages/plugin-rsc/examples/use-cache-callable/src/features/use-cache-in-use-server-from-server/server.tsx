import { defaultAction, overrideAction } from './actions'
import { UseCacheInUseServerFromServer } from './client'
import { resetAction } from './reset'
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
