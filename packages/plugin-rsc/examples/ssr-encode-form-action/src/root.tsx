import { submit } from './action'
import { getResult } from './state'

export function Root() {
  return (
    <html>
      <body>
        <form
          data-testid="server-action-form"
          action={submit.bind(null, 'bound')}
        >
          <input name="value" defaultValue="form" />
          <button type="submit">submit</button>
        </form>
        <output data-testid="result">{getResult()}</output>
      </body>
    </html>
  )
}
