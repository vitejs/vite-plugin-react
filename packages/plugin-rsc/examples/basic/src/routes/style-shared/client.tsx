'use client'

import { SharedStyle } from './shared'

export function TestStyleSharedClient() {
  return (
    <SharedStyle
      className="test-style-shared-client"
      styleTestId="style-shared-client"
      moduleTestId="css-module-shared-client"
      label="client"
    />
  )
}
