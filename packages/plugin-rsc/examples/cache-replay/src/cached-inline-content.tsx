import { inlineActionState } from './inline-action-state'

export const cachedInlineContentTitle = 'Cached inline content'

inlineActionState.imported = true

export function CachedInlineContent() {
  async function testInlineAction() {
    'use server'
    inlineActionState.invoked = true
  }

  return (
    <section data-testid="cached-inline-content">
      <h2>{cachedInlineContentTitle}</h2>
      <form action={testInlineAction}>
        <button type="submit" data-testid="invoke-inline-action">
          Invoke inline action
        </button>
      </form>
    </section>
  )
}
