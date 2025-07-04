'use client'

import React from 'react'

export function TestClient() {
  const [ok] = React.useState(() => true)
  return React.createElement('span', null, String(ok))
}
