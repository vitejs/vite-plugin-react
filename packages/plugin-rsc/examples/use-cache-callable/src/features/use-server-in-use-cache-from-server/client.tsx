'use client'

type Action = () => Promise<void>

export function UseServerInUseCacheFromServer(props: {
  defaultAction: Action
  defaultExecutions: number
  overrideAction: Action
  overrideExecutions: number
  resetAction: () => Promise<void>
}) {
  return (
    <div data-testid="use-server-in-use-cache-from-server">
      <button onClick={() => props.defaultAction()}>Call default action</button>
      <button onClick={() => props.overrideAction()}>
        Call override action
      </button>
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
      <button onClick={() => props.resetAction()}>Reset</button>
    </div>
  )
}
