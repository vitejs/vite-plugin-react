import { SourceLocationCase } from '../../client'

export function InlineDirective() {
  async function inlineAction() {
    'use server'
    return 'inline directive called'
  }

  return (
    <section id="inline-directive">
      <h2>Inline directive</h2>
      <ul>
        <li>
          <SourceLocationCase name="inline-directive" action={inlineAction} />
        </li>
      </ul>
    </section>
  )
}
