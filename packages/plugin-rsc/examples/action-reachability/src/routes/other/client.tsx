'use client'

import { otherAction } from './action.tsx'

export function OtherAction() {
  return (
    <button
      data-testid="other-action"
      onClick={async () => {
        await otherAction()
      }}
    >
      Run other action
    </button>
  )
}
