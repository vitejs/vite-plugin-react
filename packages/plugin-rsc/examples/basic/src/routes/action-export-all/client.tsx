'use client'

import React from 'react'
import { getExportAllClientValue } from './actions'

export function TestActionExportAllClient() {
  const [result, setResult] = React.useState('?')

  return (
    <button
      data-testid="test-action-export-all-client"
      onClick={async () => {
        setResult(await getExportAllClientValue())
      }}
    >
      server-to-client: {result}
    </button>
  )
}
