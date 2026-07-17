import { secondInlineActionState } from './inline-action-state'

secondInlineActionState.imported = true

export function SecondInlineContent() {
  async function testSecondInlineAction() {
    'use server'
    secondInlineActionState.invoked = true
  }

  return (
    <section data-testid="second-inline-content">
      <h2>Second inline content</h2>
      <form action={testSecondInlineAction}>
        <button type="submit" data-testid="invoke-second-inline-action">
          Invoke second inline action
        </button>
      </form>
    </section>
  )
}
