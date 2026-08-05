import { arrayValue, cachedFromServer, objectValue } from './action'
import { FileDirectiveFromServerClient } from './client'
import { resetAction } from './reset'
import { state } from './state'

export function FileDirectiveFromServer() {
  return (
    <FileDirectiveFromServerClient
      action={cachedFromServer}
      executionCount={state.executionCount}
      ordinaryExports={`${objectValue.text}: ${arrayValue.join(', ')}`}
      resetAction={resetAction}
      result={state.result}
    />
  )
}
