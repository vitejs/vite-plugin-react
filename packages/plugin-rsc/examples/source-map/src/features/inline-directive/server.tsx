import { SourceLocationCase } from '../../client'

export function InlineDirective() {
  const captured = 'captured'

  async function inlineAction() {
    'use server'
    return 'inline directive called'
  }

  const inlineArrow = async (suffix = 'arrow') => {
    'use server'
    return `${captured} ${suffix} called`
  }

  return (
    <section id="inline-directive">
      <h2>Inline directive</h2>
      <ul>
        <li>
          <SourceLocationCase name="inline-directive" action={inlineAction} />
        </li>
        <li>
          <SourceLocationCase name="inline-arrow" action={inlineArrow} />
        </li>
        <li>
          <SourceLocationCase
            name="inline-function-expression"
            action={async function () {
              'use server'
              return 'inline function expression called'
            }}
          />
        </li>
      </ul>
    </section>
  )
}
