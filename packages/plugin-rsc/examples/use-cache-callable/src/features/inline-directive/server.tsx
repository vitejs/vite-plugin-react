import { InlineDirectiveClient } from './client'

let implementationCalls = 0
let result = 'none'

export function InlineDirective() {
  const captured = 'captured'

  async function cachedAction(formData: FormData) {
    'use cache'
    const argument = String(formData.get('argument'))
    implementationCalls++
    result = `${captured}:${argument}:${implementationCalls}`
  }

  return <InlineDirectiveClient action={cachedAction} result={result} />
}
