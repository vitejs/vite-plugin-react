'use client'

import { useActionState } from 'react'
import { incrementFromClient } from './action.ts'

export function ActionFromClient() {
  const [count, action] = useActionState(incrementFromClient, 0)
  return (
    <form action={action}>
      <button>From client: {count}</button>
    </form>
  )
}
