'use client'

import React from 'react'

// similar to
// https://github.com/vercel/swr/blob/063fe55dddb95f0b6c3f1637a935c43d732ded78/src/index/use-swr.ts#L3
// https://github.com/TanStack/store/blob/1d1323283e79059821d6c731eaaee60e4143dbc2/packages/react-store/src/index.ts#L1
import { useSyncExternalStore } from 'use-sync-external-store/shim/index.js'

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
      'data-testid': 'transitive-use-sync-external-store-client',
    },
    value,
  )
}
