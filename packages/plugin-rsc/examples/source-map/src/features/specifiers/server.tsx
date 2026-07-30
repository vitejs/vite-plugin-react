import { SourceLocationCase } from '../../client'
import { exportAllAction } from './export-all'
import { aliasedAction } from './local-alias'
import { reexportedAction } from './reexport'

export function Specifiers() {
  return (
    <section id="specifiers">
      <h2>Export specifiers</h2>
      <ul>
        <li>
          <SourceLocationCase name="local-alias" action={aliasedAction} />
        </li>
        <li>
          <SourceLocationCase name="re-export" action={reexportedAction} />
        </li>
        <li>
          <SourceLocationCase name="export-all" action={exportAllAction} />
        </li>
      </ul>
    </section>
  )
}
