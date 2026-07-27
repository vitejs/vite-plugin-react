'use client'

import { useState } from 'react'

export function CallableCacheClient(props: {
  action: (argument: string) => Promise<string>
}) {
  const [requests, setRequests] = useState(0)
  const [result, setResult] = useState('none')

  async function call(argument: string) {
    setRequests((value) => value + 1)
    setResult(await props.action(argument))
  }

  return (
    <div data-testid="callable-cache">
      <button onClick={() => void call('same')}>same</button>
      <button onClick={() => void call('different')}>different</button>
      <span>
        requests: {requests}; result: {result}
      </span>
    </div>
  )
}
