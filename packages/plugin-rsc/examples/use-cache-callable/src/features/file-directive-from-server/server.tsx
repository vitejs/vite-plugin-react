import { cachedFromServer } from './action'
import { FileDirectiveFromServerClient } from './client'
import { resetAction } from './reset'
import { state } from './state'

export function FileDirectiveFromServer() {
  return (
    <FileDirectiveFromServerClient
      action={cachedFromServer}
      executionCount={state.executionCount}
      resetAction={resetAction}
      result={state.result}
    />
  )
}
