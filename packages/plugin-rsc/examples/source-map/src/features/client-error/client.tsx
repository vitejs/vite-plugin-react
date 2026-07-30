'use client'

import { useEffect, useState } from 'react'

export function ClientError() {
  const [shouldThrow, setShouldThrow] = useState(false)

  useEffect(() => {
    if (shouldThrow) {
      throw new Error('client-source-map')
    }
  }, [shouldThrow])

  return (
    <section>
      <h2>Client error</h2>
      <button onClick={() => setShouldThrow(true)}>Throw client error</button>
    </section>
  )
}
