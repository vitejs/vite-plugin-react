import { ProtectedCapturesClient } from './client'
import { resetAction, selectCaptureAction } from './reset'
import { state } from './state'

export function ProtectedCaptures() {
  const captured =
    state.capture === 'first' ? 'capture-secret-one' : 'capture-secret-two'

  async function cachedAction(formData: FormData) {
    'use cache'
    const argument = String(formData.get('argument'))
    state.executionCount++
    state.result = `${captured.endsWith('one') ? 'first' : 'second'} + ${argument}`
  }

  return (
    <ProtectedCapturesClient
      action={cachedAction}
      capture={state.capture}
      executionCount={state.executionCount}
      resetAction={resetAction}
      result={state.result}
      selectCaptureAction={selectCaptureAction}
    />
  )
}
