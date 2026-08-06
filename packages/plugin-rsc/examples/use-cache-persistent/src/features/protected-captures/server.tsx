import { ProtectedCapturesClient } from './client'
import { resetAction, selectCaptureAction } from './reset'
import { state } from './state'

export function ProtectedCaptures() {
  const captured =
    state.capture === 'first' ? 'capture-secret-one' : 'capture-secret-two'

  async function cachedAction(argument: string) {
    'use cache'
    state.executionCount++
    state.result = `${captured.endsWith('one') ? 'first' : 'second'} + ${argument}`
  }

  return (
    <>
      <form action={selectCaptureAction}>
        <button name="capture" value="first">
          First capture
        </button>{' '}
        <button name="capture" value="second">
          Second capture
        </button>
        <p>
          Selected capture:{' '}
          <output data-testid="capture">{state.capture}</output>
        </p>
      </form>
      <ProtectedCapturesClient
        action={cachedAction}
        executionCount={state.executionCount}
        resetAction={resetAction}
        result={state.result}
      />
    </>
  )
}
