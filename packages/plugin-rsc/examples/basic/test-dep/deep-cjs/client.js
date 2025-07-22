'use client'

import React from 'react'
import { useSyncExternalStore } from 'use-sync-external-store'

const h = React.createElement

const noopStore = () => () => {}

export function TestClient() {
  const value = useSyncExternalStore(
    noopStore,
    () => 'ok:browser',
    () => 'ok:ssr',
  )

  return h(
    'span',
    {
      'data-testid': 'deep-cjs-client',
    },
    value,
  )
}
