'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    __serverReferenceSourceLocation?: () => Promise<string>
  }
}

export function Client(props: { action: () => Promise<string> }) {
  const [result, setResult] = useState('ready')

  useEffect(() => {
    window.__serverReferenceSourceLocation = props.action
  }, [props.action])

  return (
    <button onClick={() => void props.action().then(setResult)}>
      {result}
    </button>
  )
}
