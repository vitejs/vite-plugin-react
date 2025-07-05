import React from 'react'
import { TestClient } from './client.js'

export async function TestClientInServerDep() {
  return React.createElement(TestClient)
}
