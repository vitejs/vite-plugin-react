'use client'

import { commands } from './commands.tsx'

export function HomeAction() {
  return (
    <button
      data-testid="home-action"
      onClick={async () => {
        // Delay dispatch so navigation changes the action request's route.
        await new Promise((resolve) => setTimeout(resolve, 500))
        await commands.objectWrappedAction()
      }}
    >
      Run delayed home action
    </button>
  )
}
