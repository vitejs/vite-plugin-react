import { FileDirectiveArgumentAdmission } from './client'
import { resetAction } from './reset'
import { state } from './state'

export function FileDirectiveArgumentAdmissionServer() {
  return (
    <FileDirectiveArgumentAdmission
      executionCount={state.executionCount}
      resetAction={resetAction}
      result={state.result}
    />
  )
}
