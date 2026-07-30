import { cachedFromServer } from './action'
import { FileDirectiveFromServerClient } from './client'
import { state } from './state'

export function FileDirectiveFromServer() {
  return (
    <FileDirectiveFromServerClient
      action={cachedFromServer}
      executionCount={state.executionCount}
      result={state.result}
    />
  )
}
