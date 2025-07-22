import * as rscHtmlStreamClient from 'rsc-html-stream/client'

/** @deprecated use `rsc-html-stream/client` instead */
export const getRscStreamFromHtml = (): ReadableStream<Uint8Array> =>
  rscHtmlStreamClient.rscStream
