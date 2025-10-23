'use client'

import React from 'react'
import { testShared } from './shared'

export function TestClient({
  testSharedFromServer,
}: {
  testSharedFromServer: string
}) {
  React.useEffect(() => {
    if (testShared !== testSharedFromServer) {
      console.log({ testShared, testSharedFromServer })
      throw new Error(
        `Mismatch: ${JSON.stringify({ testShared, testSharedFromServer })}`,
      )
    }
  }, [testShared, testSharedFromServer])

  return <>ok ({testShared})</>
}
