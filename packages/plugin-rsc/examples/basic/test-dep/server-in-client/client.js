'use client'

import { changeCounter } from './server.js'
import React from 'react'

const h = React.createElement

export function TestClient() {
  const [count, setCount] = React.useState(() => '?')

  return h(
    'button',
    {
      'data-testid': 'server-in-client',
      onClick: async () => {
        setCount(await changeCounter(1))
      },
    },
    `server-in-client: ${count}`,
  )
}
