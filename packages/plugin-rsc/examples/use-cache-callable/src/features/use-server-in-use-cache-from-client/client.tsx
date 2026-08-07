'use client'

import { defaultAction, overrideAction } from './actions'
import { resetAction } from './reset'

export function UseServerInUseCacheFromClient(props: {
  defaultExecutions: number
  overrideExecutions: number
}) {
  return (
    <div data-testid="use-server-in-use-cache-from-client">
      <button onClick={() => defaultAction()}>Call default action</button>
      <button onClick={() => overrideAction()}>Call override action</button>
      <p>
        Default executions:{' '}
        <output data-testid="default-executions">
          {props.defaultExecutions}
        </output>
        <br />
        Override executions:{' '}
        <output data-testid="override-executions">
          {props.overrideExecutions}
        </output>
      </p>
      <button onClick={() => resetAction()}>Reset</button>
    </div>
  )
}
