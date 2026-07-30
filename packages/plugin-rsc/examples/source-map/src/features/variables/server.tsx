import { SourceLocationCase } from '../../client'
import { arrowFunction, functionExpression } from './action'

export function Variables() {
  return (
    <section id="variables">
      <h2>Variables</h2>
      <ul>
        <li>
          <SourceLocationCase name="arrow-function" action={arrowFunction} />
        </li>
        <li>
          <SourceLocationCase
            name="function-expression"
            action={functionExpression}
          />
        </li>
      </ul>
    </section>
  )
}
