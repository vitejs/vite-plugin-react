import { resetAction } from './action'
import { cachedFromServer } from './action-cached'
import { FileDirectiveFromServerClient } from './client'
import { state } from './state'

export function FileDirectiveFromServer() {
  return (
    <FileDirectiveFromServerClient
      action={cachedFromServer}
      executionCount={state.executionCount}
      resetAction={resetAction}
    />
  )
}
