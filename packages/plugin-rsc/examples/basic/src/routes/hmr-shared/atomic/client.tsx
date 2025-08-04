'use client'

import React from 'react'
import { testShared } from './shared'

export function TestClient({
  testSharedFromServer,
}: {
  testSharedFromServer: string
}) {
  React.useEffect(() => {
    console.log({ testShared, testSharedFromServer })
    if (testShared !== testSharedFromServer) {
      throw new Error(
        `Mismatch: ${JSON.stringify({ testShared, testSharedFromServer })}`,
      )
    }
  }, [testShared, testSharedFromServer])

  return <>ok ({testShared})</>
}
