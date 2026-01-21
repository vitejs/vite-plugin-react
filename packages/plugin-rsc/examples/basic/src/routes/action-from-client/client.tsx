'use client'

import React from 'react'
import {
  testAction,
  testAction2,
  testActionState,
  testNonFormActionArgs,
  testNonFormActionError,
} from './action'

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
      <button data-testid="use-action-state">
        test-useActionState: {state}
      </button>
    </form>
  )
}

export function TestNonFormActionError() {
  const [state, setState] = React.useState('?')
  return (
    <button
      data-testid="non-form-action-error"
      onClick={async () => {
        try {
          await testNonFormActionError()
          setState('no-error')
        } catch (e) {
          setState(e instanceof Error ? e.message : 'unknown-error')
        }
      }}
    >
      non-form-action-error: {state}
    </button>
  )
}

export function TestNonFormActionArgs() {
  const [state, setState] = React.useState('?')
  return (
    <button
      data-testid="non-form-action-args"
      onClick={async () => {
        const result = await testNonFormActionArgs({ name: 'test', count: 42 })
        setState(result)
      }}
    >
      non-form-action-args: {state}
    </button>
  )
}
