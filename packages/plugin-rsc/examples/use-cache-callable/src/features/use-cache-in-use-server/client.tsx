'use client'

import { defaultAction, overrideAction, resetAction } from './actions'

export function UseCacheInUseServerClient(props: {
  defaultExecutions: number
  overrideExecutions: number
}) {
  return (
    <div data-testid="use-cache-in-use-server">
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
