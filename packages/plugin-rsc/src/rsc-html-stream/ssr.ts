import * as rscHtmlStreamServer from 'rsc-html-stream/server'

/** @deprecated use `rsc-html-stream/server` instead */
export const injectRscStreamToHtml = (
  stream: ReadableStream<Uint8Array>,
  options?: { nonce?: string },
): TransformStream<Uint8Array, Uint8Array> =>
  rscHtmlStreamServer.injectRSCPayload(stream, options)
