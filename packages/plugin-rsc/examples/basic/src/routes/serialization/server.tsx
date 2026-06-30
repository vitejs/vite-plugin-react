import {
  createFromReadableStream,
  registerServerReference,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import { testSerializationAction } from './action'
import { TestPreservedServerReference, TestSerializationClient } from './client'

export function TestSerializationServer() {
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
  return (
    <div>
      test-serialization:{deserialized}
      <TestSerializationPreservedServerReference />
    </div>
  )
}

async function TestSerializationPreservedServerReference() {
  const deserialized = createFromReadableStream(
    renderToReadableStream(createSyntheticServerReferenceElement()),
    {
      serverReferences: 'preserve',
    },
  )
  return <>{deserialized}</>
}

function createSyntheticServerReferenceElement() {
  return (
    <TestPreservedServerReference
      action={registerServerReference(
        async () => {
          throw new Error('This synthetic reference should never be called')
        },
        // This id intentionally has no backing module; re-rendering only works
        // when the decoded server reference is preserved as an opaque reference.
        'virtual:test-preserved-server-reference',
        'action',
      )}
    />
  )
}
