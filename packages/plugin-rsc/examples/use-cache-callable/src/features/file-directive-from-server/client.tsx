'use client'

import { useState } from 'react'

export function FileDirectiveFromServerClient(props: {
  action: (argument: string) => Promise<string>
}) {
  const [requests, setRequests] = useState(0)
  const [result, setResult] = useState('none')

  async function call() {
    setRequests((value) => value + 1)
    setResult(await props.action('same'))
  }

  return (
    <div data-testid="file-directive-from-server">
      <button onClick={() => void call()}>call</button>
      <span>
        requests: {requests}; result: {result}
      </span>
    </div>
  )
}
