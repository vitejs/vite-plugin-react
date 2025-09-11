import React from 'react'

const TestChunkClient1 = React.lazy(() => import('./client1'))
const TestChunkServer2 = React.lazy(() => import('./server2'))
const TestChunkServer3 = React.lazy(() => import('./server3'))
const TestChunkServer4 = React.lazy(() => import('./server4'))

export function TestChunk2() {
  return (
    <div data-testid="test-chunk2">
      <TestChunkClient1 />|
      <TestChunkServer2 />|
      <TestChunkServer3 />|
      <TestChunkServer4 />
    </div>
  )
}
