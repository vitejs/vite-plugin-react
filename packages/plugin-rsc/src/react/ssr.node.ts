import type { Readable } from 'node:stream'
// @ts-ignore
import * as ReactClient from '@vitejs/plugin-rsc/vendor/react-server-dom/client.node'
import { createServerConsumerManifest } from '../core/ssr'

export { setRequireModule } from '../core/ssr'

export function createFromReadableStream<T>(
  stream: ReadableStream<Uint8Array>,
  options: object = {},
): Promise<T> {
  return ReactClient.createFromReadableStream(stream, {
    serverConsumerManifest: createServerConsumerManifest(),
    ...options,
  })
}

export function createFromNodeStream<T>(
  stream: Readable,
  options: object = {},
): Promise<T> {
  return ReactClient.createFromNodeStream(stream, {
    serverConsumerManifest: createServerConsumerManifest(),
    ...options,
  })
}

export function createServerReference(id: string): unknown {
  return ReactClient.createServerReference(id)
}

export const callServer = null
export const findSourceMapURL = null
