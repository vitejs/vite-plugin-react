import { FileDirectiveExtraArguments } from './client'
import { resetAction } from './reset'
import { state } from './state'

export function FileDirectiveExtraArgumentsServer() {
  return (
    <FileDirectiveExtraArguments
      executionCount={state.executionCount}
      resetAction={resetAction}
      result={state.result}
    />
  )
}
