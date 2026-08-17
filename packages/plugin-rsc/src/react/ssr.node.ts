// @ts-ignore
import * as ReactClientNode from '@vitejs/plugin-rsc/vendor/react-server-dom/client.node'
import { createServerConsumerManifest } from '../core/ssr'
import type { CreateFromNodeStreamOptions } from '../types'

export function createFromNodeStream<T>(
  stream: import('node:stream').Readable,
  options: CreateFromNodeStreamOptions = {},
): Promise<T> {
  return ReactClientNode.createFromNodeStream(
    stream,
    createServerConsumerManifest(),
    options,
  )
}
