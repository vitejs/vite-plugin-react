'use client'

import { useId } from 'react'

export function TestUseIdClient() {
  const id = useId()
  return <>test-useId-client: {id}</>
}
