'use client'

import { useState } from 'react'
import { incrementServerCounter, getServerCounter } from './counter-actions'

/**
 * This page demonstrates navigation with both client and server state.
 */
export function CounterPage() {
  const [clientCount, setClientCount] = useState(0)

  return (
    <div className="page">
      <h1>Counter Page</h1>
      <p>
        This page demonstrates client and server state management with
        coordinated navigation.
      </p>
      <div className="card">
        <h2>Client Counter</h2>
        <p>Current count: {clientCount}</p>
        <div className="button-group">
          <button onClick={() => setClientCount(clientCount + 1)}>
            Increment
          </button>
          <button onClick={() => setClientCount(0)}>Reset</button>
        </div>
        <p className="note">
          This counter is managed on the client. Notice that it resets when you
          navigate away and back.
        </p>
      </div>
      <div className="card">
        <h2>Server Counter</h2>
        <ServerCounter />
        <p className="note">
          This counter is managed on the server. It persists across navigations
          because it's part of the server state.
        </p>
      </div>
      <div className="card">
        <h2>Try this:</h2>
        <ol>
          <li>Increment both counters</li>
          <li>Navigate to another page</li>
          <li>Navigate back to this page</li>
          <li>
            Notice that the client counter resets but the server counter
            persists
          </li>
        </ol>
      </div>
    </div>
  )
}

function ServerCounter() {
  const count = getServerCounter()

  return (
    <>
      <p>Current count: {count}</p>
      <form action={incrementServerCounter}>
        <button type="submit">Increment Server Counter</button>
      </form>
    </>
  )
}
