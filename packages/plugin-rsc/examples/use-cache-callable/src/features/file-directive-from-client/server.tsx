import { FileDirectiveFromClient } from './client'
import { state } from './state'

export function FileDirectiveFromClientServer() {
  return (
    <FileDirectiveFromClient
      executionCount={state.executionCount}
      result={state.result}
    />
  )
}
