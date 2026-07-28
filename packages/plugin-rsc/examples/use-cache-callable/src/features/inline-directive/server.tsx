import { InlineDirectiveClient } from './client'

let implementationCalls = 0

export function InlineDirective() {
  const captured = 'captured'

  async function cachedAction(argument: string) {
    'use cache'
    implementationCalls++
    return `${captured}:${argument}:${implementationCalls}`
  }

  return <InlineDirectiveClient action={cachedAction} />
}
