import { SourceLocationCase } from '../../client'
import { firstAction, secondAction } from './action'

export function MultipleExports() {
  return (
    <section id="multiple-exports">
      <h2>Multiple exports</h2>
      <ul>
        <li>
          <SourceLocationCase name="first-action" action={firstAction} />
        </li>
        <li>
          <SourceLocationCase name="second-action" action={secondAction} />
        </li>
      </ul>
    </section>
  )
}
