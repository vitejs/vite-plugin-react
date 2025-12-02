'use client'

import React from 'react'

export function TestHydrated() {
  const hydrated = React.useSyncExternalStore(
    React.useCallback(() => () => {}, []),
    () => true,
    () => false,
  )
  return <span data-testid="hydrated">[hydrated: {hydrated ? 1 : 0}]</span>
}

export function TestClientState() {
  return (
    <input
      className="input py-0"
      data-testid="client-state"
      placeholder="client-state"
    />
  )
}
