import { TestAssetsClient } from './client'
import './server.css'
import svg from './server.svg?no-inline'

export function TestAssetsServer() {
  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span>test-assets-server</span>
        <img
          src={svg}
          data-testid="test-assets-server-js"
          width="20"
          height="20"
        />
        <span className="test-assets-server-css" />
      </div>
      <TestAssetsClient />
    </>
  )
}
