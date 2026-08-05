import { InlineDirectiveExtraArguments } from './client'
import { resetAction } from './reset'
import { state } from './state'

export function InlineDirectiveExtraArgumentsServer() {
  async function cachedWithoutArguments() {
    'use cache'
    state.executionCount++
    state.result = `arguments: ${arguments.length}`
  }

  return (
    <InlineDirectiveExtraArguments
      action={cachedWithoutArguments}
      executionCount={state.executionCount}
      resetAction={resetAction}
      result={state.result}
    />
  )
}
