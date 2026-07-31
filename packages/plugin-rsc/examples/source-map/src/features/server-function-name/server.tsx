import { SourceLocationCase } from '../../client'
import { moduleFunctionName } from './action'

export function ServerFunctionName() {
  async function inlineFunctionName() {
    'use server'
    return new Error().stack?.split('\n')[1] ?? ''
  }

  return (
    <section>
      <h2>Server Function names</h2>
      <ul>
        <li>
          <SourceLocationCase
            name="module-function-name"
            action={moduleFunctionName}
          />
        </li>
        <li>
          <SourceLocationCase
            name="inline-function-name"
            action={inlineFunctionName}
          />
        </li>
      </ul>
    </section>
  )
}
