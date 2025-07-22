'use client'

import React from 'react'

// same as https://github.com/vercel/swr/blob/063fe55dddb95f0b6c3f1637a935c43d732ded78/src/index/use-swr.ts#L3
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
      'data-testid': 'deep-cjs-client',
    },
    value,
  )
}
