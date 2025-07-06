import * as rscHtmlStreamServer from 'rsc-html-stream/server'

export const injectRscStreamToHtml = (
  stream: ReadableStream<Uint8Array>,
  options?: { nonce?: string },
): TransformStream<Uint8Array, Uint8Array> =>
  rscHtmlStreamServer.injectRSCPayload(stream, options)
