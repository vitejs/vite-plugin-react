import { UseServerInUseCacheFromClient } from './client'
import { state } from './state'

export function UseServerInUseCacheFromClientServer() {
  return (
    <UseServerInUseCacheFromClient
      defaultExecutions={state.defaultExecutions}
      overrideExecutions={state.overrideExecutions}
    />
  )
}
