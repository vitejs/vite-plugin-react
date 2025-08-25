import { TestTailwindClient } from './client'
import { TestTailwindServer } from './server'

export function TestTailwind() {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      <TestTailwindClient />
      <span>|</span>
      <TestTailwindServer />
    </div>
  )
}
