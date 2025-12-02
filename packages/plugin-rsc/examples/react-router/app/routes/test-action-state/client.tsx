'use client'

import React from 'react'

export function TestActionStateClient(props: {
  action: (prev: React.ReactNode) => Promise<React.ReactNode>
}) {
  const [state, formAction, isPending] = React.useActionState(
    props.action,
    null,
  )

  return (
    <form data-testid="use-action-state-jsx" action={formAction}>
      <button className="btn">test-useActionState</button>
      {isPending ? 'pending...' : state}
    </form>
  )
}
