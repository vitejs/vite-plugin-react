import { TestClient } from './client.js'
import React from 'react'

export async function TestClientInServerDep() {
  return React.createElement(TestClient)
}
