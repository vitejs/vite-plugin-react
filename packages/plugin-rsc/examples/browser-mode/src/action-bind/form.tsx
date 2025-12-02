'use client'

import React from 'react'

export function TestServerActionBindClientForm(props: { action: () => Promise<React.ReactNode> }) {
  const [result, formAction] = React.useActionState(props.action, '[?]')

  return (
    <form action={formAction}>
      <button>test-server-action-bind-client</button>
      <span data-testid="test-server-action-bind-client">{result}</span>
    </form>
  )
}
