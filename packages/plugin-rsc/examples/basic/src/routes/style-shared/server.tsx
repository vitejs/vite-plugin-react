import { TestStyleSharedClient } from './client'
import { SharedStyle } from './shared'

export function TestStyleShared() {
  return (
    <div style={{ display: 'flex' }}>
      <SharedStyle
        className="test-style-shared-server"
        styleTestId="style-shared-server"
        moduleTestId="css-module-shared-server"
        label="server"
      />
      <span>|</span>
      <TestStyleSharedClient />
    </div>
  )
}
