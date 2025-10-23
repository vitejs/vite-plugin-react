import { TestUseIdClient } from './client'
import { useId } from 'react'

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
