export function stringToStream(data: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(data))
      controller.close()
    },
  })
}

export function arrayToStream(data: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(data)
      controller.close()
    },
  })
}

export async function concatArrayStream(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []
  await stream.pipeTo(
    new WritableStream({
      write(chunk) {
        chunks.push(chunk)
      },
    }),
  )
  return concatArray(chunks)
}

export function toBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
}

export function fromBase64(data: string): Uint8Array {
  return Uint8Array.from(atob(data), (character) => character.charCodeAt(0))
}

export function concatStreams(
  first: ReadableStream<Uint8Array>,
  second: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  // Append the resumed HTML after the prerendered shell closes.
  return first.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      async flush(controller) {
        await second.pipeTo(
          new WritableStream({
            write(chunk) {
              controller.enqueue(chunk)
            },
          }),
        )
      },
    }),
  )
}

export function preventStreamClose(
  stream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      flush() {
        return new Promise<void>(() => {})
      },
    }),
  )
}

function concatArray(chunks: Uint8Array[]): Uint8Array {
  let total = 0
  for (const chunk of chunks) {
    total += chunk.length
  }
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}
