export function stringToStream(data: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(data))
      controller.close()
    },
  })
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
