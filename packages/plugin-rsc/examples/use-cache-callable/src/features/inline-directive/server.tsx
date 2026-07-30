import { InlineDirectiveClient } from './client'
import { resetAction } from './reset'
import { state } from './state'

export function InlineDirective() {
  const captured = 'captured'

  async function cachedAction(formData: FormData) {
    'use cache'
    const argument = String(formData.get('argument'))
    state.executionCount++
    state.result = `${captured} + ${argument}`
  }

  return (
    <InlineDirectiveClient
      action={cachedAction}
      executionCount={state.executionCount}
      resetAction={resetAction}
      result={state.result}
    />
  )
}
