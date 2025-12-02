'use client'

import React from 'react'

import { ok } from '@vitejs/test-dep-cjs'

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
