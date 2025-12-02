import { TestClientChunk1, TestClientChunkConflict as TestClientChunkConflict1 } from './client1'
import { TestClientChunk2 } from './client2'
import { TestClientChunk3, TestClientChunkConflict as TestClientChunkConflict3 } from './client3'

export function TestClientChunkServer() {
  return (
    <div data-testid="test-client-chunk">
      <TestClientChunk1 />|
      <TestClientChunkConflict1 />|
      <TestClientChunk2 />|
      <TestClientChunk3 />|
      <TestClientChunkConflict3 />
    </div>
  )
}
