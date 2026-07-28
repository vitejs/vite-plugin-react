'use client'

import { commands } from './commands.tsx'

export function ClientForm() {
  return (
    <form
      action={async () => {
        await commands.objectWrappedAction()
      }}
    >
      <button data-testid="object-wrapped-action">
        Run object-wrapped action
      </button>
    </form>
  )
}
