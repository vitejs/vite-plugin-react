'use client'

import React from 'react'

import { testActionState } from './action'

export function TestUseActionState() {
  const [state, formAction] = React.useActionState(testActionState, 0)

  return (
    <form action={formAction}>
      <button data-testid="use-action-state">useActionState: {state}</button>
    </form>
  )
}
