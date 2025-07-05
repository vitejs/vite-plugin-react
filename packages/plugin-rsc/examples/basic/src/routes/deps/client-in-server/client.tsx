'use client'

// @ts-ignore
import { TestContextValue } from '@vitejs/test-dep-client-in-server2/client'

export function TestContextValueIndirect() {
  return <TestContextValue />
}
