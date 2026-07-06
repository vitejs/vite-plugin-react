import { TestClient } from '@vitejs/test-dep-transitive-client/client'
import React from 'react'

export async function TestServerWithTransitiveClientDep() {
  return React.createElement(TestClient)
}
