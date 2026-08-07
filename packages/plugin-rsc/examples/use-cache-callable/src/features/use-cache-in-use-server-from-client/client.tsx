'use client'

import { defaultAction, overrideAction } from './actions'
import { resetAction } from './reset'

export function UseCacheInUseServerFromClient(props: {
  defaultExecutions: number
  overrideExecutions: number
}) {
  return (
    <div data-testid="use-cache-in-use-server-from-client">
      <form action={defaultAction.bind(null, 'same-key')}>
        <button>Call default action</button>
      </form>
      <form action={overrideAction.bind(null, 'same-key')}>
        <button>Call override action</button>
      </form>
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
      <form action={resetAction}>
        <button>Reset</button>
      </form>
    </div>
  )
}
