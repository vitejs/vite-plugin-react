import { SourceLocationCase } from '../../client'
import { namedFunction } from './action'

export function NamedFunction() {
  return (
    <section id="named-function">
      <h2>Named function</h2>
      <ul>
        <li>
          <SourceLocationCase name="named-function" action={namedFunction} />
        </li>
      </ul>
    </section>
  )
}
