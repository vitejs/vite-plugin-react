'use client'

type Action = (key: string) => Promise<void>

export function UseServerInUseCacheFromServer(props: {
  defaultAction: Action
  defaultExecutions: number
  overrideAction: Action
  overrideExecutions: number
  resetAction: () => Promise<void>
}) {
  return (
    <div data-testid="use-server-in-use-cache-from-server">
      <form action={props.defaultAction.bind(null, 'same-key')}>
        <button>Call default action</button>
      </form>
      <form action={props.overrideAction.bind(null, 'same-key')}>
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
      <form action={props.resetAction}>
        <button>Reset</button>
      </form>
    </div>
  )
}
