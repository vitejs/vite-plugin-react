import { SourceLocationCase } from '../../client'
import defaultAnonymousFunction from './anonymous'
import defaultIdentifier from './identifier'
import defaultNamedFunction from './named'

export function Defaults() {
  return (
    <section id="defaults">
      <h2>Default exports</h2>
      <ul>
        <li>
          <SourceLocationCase
            name="default-named-function"
            action={defaultNamedFunction}
          />
        </li>
        <li>
          <SourceLocationCase
            name="default-anonymous-function"
            action={defaultAnonymousFunction}
          />
        </li>
        <li>
          <SourceLocationCase
            name="default-identifier"
            action={defaultIdentifier}
          />
        </li>
      </ul>
    </section>
  )
}
