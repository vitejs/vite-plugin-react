'use client'

import './client.css'
import svg from './client.svg'

export function TestAssetsClient() {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <span>test-assets-client</span>
      <img src={svg} data-testid="test-assets-client-js" width="20" />
      {/* TODO? */}
      <span className="test-assets-client-css" />
    </div>
  )
}
