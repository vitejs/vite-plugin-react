'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    __serverReferenceSourceLocations?: Record<string, () => Promise<string>>
  }
}

export function SourceLocationCase(props: {
  name: string
  action: () => Promise<string>
}) {
  const [result, setResult] = useState('ready')

  useEffect(() => {
    const actions = (window.__serverReferenceSourceLocations ??= {})
    actions[props.name] = props.action
  }, [props.action, props.name])

  return (
    <button onClick={() => void props.action().then(setResult)}>
      <code>{props.name}</code>: {result}
    </button>
  )
}
