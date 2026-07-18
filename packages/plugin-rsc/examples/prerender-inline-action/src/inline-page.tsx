import { actionState } from './action-state'

export const pageTitle = 'Prerendered inline action'

actionState.imported = true

export function InlinePage() {
  async function invoke() {
    'use server'
    actionState.invoked = true
  }

  return (
    <section data-testid="inline-page">
      <h2>{pageTitle}</h2>
      <form action={invoke}>
        <button type="submit" data-testid="invoke-action">
          Invoke action
        </button>
      </form>
    </section>
  )
}
