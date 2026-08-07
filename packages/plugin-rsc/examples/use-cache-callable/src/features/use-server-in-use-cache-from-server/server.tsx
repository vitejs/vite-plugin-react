import { defaultAction, overrideAction } from './actions'
import { UseServerInUseCacheFromServer } from './client'
import { resetAction } from './reset'
import { state } from './state'

export function UseServerInUseCacheFromServerServer() {
  return (
    <UseServerInUseCacheFromServer
      defaultAction={defaultAction}
      defaultExecutions={state.defaultExecutions}
      overrideAction={overrideAction}
      overrideExecutions={state.overrideExecutions}
      resetAction={resetAction}
    />
  )
}
