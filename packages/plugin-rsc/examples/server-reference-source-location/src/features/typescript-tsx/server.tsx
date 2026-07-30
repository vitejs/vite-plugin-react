import { SourceLocationCase } from '../../client'
import { typescriptTsx } from './action'

export function TypescriptTsx() {
  return (
    <section id="typescript-tsx">
      <h2>TypeScript and TSX</h2>
      <ul>
        <li>
          <SourceLocationCase name="typescript-tsx" action={typescriptTsx} />
        </li>
      </ul>
    </section>
  )
}
