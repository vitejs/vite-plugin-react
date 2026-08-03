import { cachedFromServer } from './action'
import { FileDirectiveFromServerClient } from './client'
import { resetAction } from './reset'
import { state } from './state'

export function FileDirectiveFromServer() {
  return (
    <>
      <p>
        Callable name:{' '}
        <output data-testid="callable-name">{cachedFromServer.name}</output>
      </p>
      <FileDirectiveFromServerClient
        action={cachedFromServer}
        executionCount={state.executionCount}
        resetAction={resetAction}
        result={state.result}
      />
    </>
  )
}
