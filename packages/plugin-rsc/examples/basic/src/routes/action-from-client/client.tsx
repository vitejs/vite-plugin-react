'use client'

import React from 'react'
import { testAction, testAction2, testActionState } from './action'

export function TestActionFromClient() {
  return (
    <form action={testAction}>
      <button>test-action-from-client</button>
      <button formAction={testAction2}>test-action-from-client-2</button>
    </form>
  )
}

export function TestUseActionState() {
  const [state, formAction] = React.useActionState(testActionState, 0)

  return (
    <form action={formAction}>
      <button data-testid="use-action-state">test-useActionState: {state}</button>
    </form>
  )
}
