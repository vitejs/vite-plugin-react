'use client'

import { useState } from 'react'
import { cachedFromClient } from './action'

export function FileDirectiveFromClient(props: { result: string }) {
  const [requests, setRequests] = useState(0)

  return (
    <form
      action={cachedFromClient}
      data-testid="file-directive-from-client"
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
