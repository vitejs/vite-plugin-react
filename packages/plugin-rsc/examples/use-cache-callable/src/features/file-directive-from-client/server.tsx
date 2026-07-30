import { FileDirectiveFromClient } from './client'
import { resetAction } from './reset'
import { state } from './state'

export function FileDirectiveFromClientServer() {
  return (
    <FileDirectiveFromClient
      executionCount={state.executionCount}
      resetAction={resetAction}
      result={state.result}
    />
  )
}
