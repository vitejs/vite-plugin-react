'use client'

import { ok } from '@vitejs/test-dep-cjs'
import React from 'react'

const h = React.createElement

export function TestClient() {
  return h(
    'span',
    {
      'data-testid': 'transitive-cjs-client',
    },
    ok,
  )
}
