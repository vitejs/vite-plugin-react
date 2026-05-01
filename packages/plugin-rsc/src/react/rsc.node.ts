import type { Readable } from 'node:stream'
// @ts-ignore
import * as ReactClient from '@vitejs/plugin-rsc/vendor/react-server-dom/client.node'
// @ts-ignore
import * as ReactServer from '@vitejs/plugin-rsc/vendor/react-server-dom/server.node'
import type { ReactFormState } from 'react-dom/client'
import {
  createClientManifest,
  createServerDecodeClientManifest,
  createServerManifest,
} from '../core/rsc'
import type {
  ClientTemporaryReferenceSet,
  DecodeReplyFunction,
  EncodeReplyFunction,
  RenderToReadableStreamOptions,
  ServerTemporaryReferenceSet,
} from '../types'

export { loadServerAction, setRequireModule } from '../core/rsc'

export interface PipeableStream {
  abort(reason: unknown): void
  pipe<Writable extends NodeJS.WritableStream>(destination: Writable): Writable
}

export function renderToPipeableStream<T>(
  data: T,
  options?: RenderToReadableStreamOptions,
  extraOptions?: {
    /**
     * @internal
     */
    onClientReference?: (metadata: { id: string; name: string }) => void
  },
): PipeableStream {
  return ReactServer.renderToPipeableStream(
    data,
    createClientManifest({
      onClientReference: extraOptions?.onClientReference,
    }),
    options,
  )
}

export function renderToReadableStream<T>(
  data: T,
  options?: RenderToReadableStreamOptions,
  extraOptions?: {
    /**
     * @internal
     */
    onClientReference?: (metadata: { id: string; name: string }) => void
  },
): ReadableStream<Uint8Array> {
  return ReactServer.renderToReadableStream(
    data,
    createClientManifest({
      onClientReference: extraOptions?.onClientReference,
    }),
    options,
  )
}

export function createFromReadableStream<T>(
  stream: ReadableStream<Uint8Array>,
  options: object = {},
): Promise<T> {
  return ReactClient.createFromReadableStream(stream, {
    serverConsumerManifest: {
      serverModuleMap: createServerManifest(),
      moduleMap: createServerDecodeClientManifest(),
    },
    ...options,
  })
}

export function createFromNodeStream<T>(
  stream: Readable,
  options: object = {},
): Promise<T> {
  return ReactClient.createFromNodeStream(stream, {
    serverConsumerManifest: {
      serverModuleMap: createServerManifest(),
      moduleMap: createServerDecodeClientManifest(),
    },
    ...options,
  })
}

export function registerClientReference<T>(
  proxy: T,
  id: string,
  name: string,
): T {
  return ReactServer.registerClientReference(proxy, id, name)
}

export const registerServerReference: <T>(
  ref: T,
  id: string,
  name: string,
) => T = ReactServer.registerServerReference

export const decodeReply: DecodeReplyFunction = (body, options) =>
  ReactServer.decodeReply(body, createServerManifest(), options)

export function decodeAction(body: FormData): Promise<() => Promise<void>> {
  return ReactServer.decodeAction(body, createServerManifest())
}

export function decodeFormState(
  actionResult: unknown,
  body: FormData,
): Promise<ReactFormState | undefined> {
  return ReactServer.decodeFormState(actionResult, body, createServerManifest())
}

export const createTemporaryReferenceSet: () => ServerTemporaryReferenceSet =
  ReactServer.createTemporaryReferenceSet

export const encodeReply: EncodeReplyFunction = ReactClient.encodeReply

export const createClientTemporaryReferenceSet: () => ClientTemporaryReferenceSet =
  ReactClient.createTemporaryReferenceSet
