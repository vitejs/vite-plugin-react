import {
  createFromReadableStream,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import { testSerializationAction } from './action'
import { TestSerializationClient } from './client'

export function TestSerializationServer() {
  if (1) {
    return <div>test-serialization:todo</div>
  }
  const original = <TestSerializationClient action={testSerializationAction} />
  let serialized = renderToReadableStream(original)
  // debug serialization
  if (0) {
    serialized = (serialized as ReadableStream<Uint8Array<ArrayBuffer>>)
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            console.log('[test-serialization]', { chunk })
            controller.enqueue(chunk)
          },
        }),
      )
      .pipeThrough(new TextEncoderStream())
  }
  const deserialized = createFromReadableStream<typeof original>(serialized)
  return <div>test-serialization:{deserialized}</div>
}
