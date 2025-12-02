import { useId } from 'react'

import { TestUseIdClient } from './client'

export function TestUseId() {
  return (
    <div data-testid="use-id">
      <TestUseIdServer />
      |
      <TestUseIdClient />
    </div>
  )
}

function TestUseIdServer() {
  const id = useId()
  return <>test-useId-server: {id}</>
}
