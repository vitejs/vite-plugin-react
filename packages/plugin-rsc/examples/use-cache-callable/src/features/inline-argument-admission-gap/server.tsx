import { InlineArgumentAdmissionGap } from './client'
import { resetAction } from './reset'
import { state } from './state'

export function InlineArgumentAdmissionGapServer() {
  async function cachedWithoutArguments() {
    'use cache'
    state.executionCount++
    state.result = `arguments: ${arguments.length}`
  }

  return (
    <InlineArgumentAdmissionGap
      action={cachedWithoutArguments}
      executionCount={state.executionCount}
      resetAction={resetAction}
      result={state.result}
    />
  )
}
