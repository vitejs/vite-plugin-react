'use client'

import { testActionState } from './action'
import React from 'react'

export function TestUseActionState() {
  const [state, formAction] = React.useActionState(testActionState, 0)

  return (
    <form action={formAction}>
      <button data-testid="use-action-state">useActionState: {state}</button>
    </form>
  )
}
