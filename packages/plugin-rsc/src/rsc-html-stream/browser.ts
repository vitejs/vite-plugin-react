import * as rscHtmlStreamClient from 'rsc-html-stream/client'

export const getRscStreamFromHtml = (): ReadableStream<Uint8Array> =>
  rscHtmlStreamClient.rscStream
