'use client'

import { commands } from './commands.tsx'

export function ActionA() {
  return (
    <button
      data-testid="action-a"
      onClick={async () => {
        // Delay dispatch so navigation changes the action request's route.
        await new Promise((resolve) => setTimeout(resolve, 500))
        await commands.actionA()
      }}
    >
      Run delayed action A
    </button>
  )
}
