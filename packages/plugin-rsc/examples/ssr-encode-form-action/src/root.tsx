import { testAction } from './action'
import { getServerState } from './state'

export function Root() {
  return (
    <html>
      <body>
        <form
          data-testid="server-action-form"
          action={testAction.bind(null, 'bound')}
        >
          <input name="value" defaultValue="form" />
          <button type="submit">test-action</button>
        </form>
        <output data-testid="result">{getServerState()}</output>
      </body>
    </html>
  )
}
