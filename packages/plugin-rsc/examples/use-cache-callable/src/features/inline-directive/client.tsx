'use client'

import { useState } from 'react'

export function InlineDirectiveClient(props: {
  action: (formData: FormData) => Promise<void>
  result: string
}) {
  const [requests, setRequests] = useState(0)

  return (
    <form
      action={props.action}
      data-testid="inline-directive"
      onSubmit={() => setRequests((value) => value + 1)}
    >
      <input name="argument" aria-label="argument" defaultValue="same" />
      <button>call</button>
      <span>
        requests: {requests}; result: {props.result}
      </span>
    </form>
  )
}
