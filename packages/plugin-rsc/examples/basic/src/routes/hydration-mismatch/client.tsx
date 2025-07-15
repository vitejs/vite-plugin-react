'use client'

export function Mismatch() {
  const value = typeof window !== 'undefined' ? 'browser' : 'ssr'
  return <>[{value}]</>
}
