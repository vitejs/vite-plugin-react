// @ts-expect-error React server vendor import
import * as ReactClient from '@vitejs/plugin-rsc/vendor/react-server-dom/client.edge'
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

export function createServerReference(id: string): unknown {
  return ReactClient.createServerReference(id)
}

export const callServer = null
export const findSourceMapURL = null
