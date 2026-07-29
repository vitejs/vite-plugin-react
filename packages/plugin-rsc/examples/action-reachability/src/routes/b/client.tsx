'use client'

import { actionB } from './action.tsx'

export function ActionB() {
  return (
    <button
      data-testid="action-b"
      onClick={async () => {
        await actionB()
      }}
    >
      Run action B
    </button>
  )
}
