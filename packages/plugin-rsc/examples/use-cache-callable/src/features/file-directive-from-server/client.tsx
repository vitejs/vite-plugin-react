'use client'

import { useState } from 'react'

export function FileDirectiveFromServerClient(props: {
  action: (formData: FormData) => Promise<void>
  result: string
}) {
  const [requests, setRequests] = useState(0)

  return (
    <form
      action={props.action}
      data-testid="file-directive-from-server"
      onSubmit={() => setRequests((value) => value + 1)}
    >
      <input type="hidden" name="argument" value="same" />
      <button>call</button>
      <span>
        requests: {requests}; result: {props.result}
      </span>
    </form>
  )
}
