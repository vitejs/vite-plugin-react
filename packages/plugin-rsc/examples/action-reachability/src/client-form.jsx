'use client'

import { commands } from './commands.js'

export function ClientForm() {
  return (
    <form action={commands.objectWrappedAction}>
      <button data-testid="object-wrapped-action">
        Run object-wrapped action
      </button>
    </form>
  )
}
