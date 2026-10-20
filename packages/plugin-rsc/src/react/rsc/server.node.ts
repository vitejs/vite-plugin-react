// @ts-ignore
import * as ReactServerNode from '@vitejs/plugin-rsc/vendor/react-server-dom/server.node'
import type { ReactFormState } from 'react-dom/client'
import {
  createClientManifest,
  createServerManifest,
  type CreateClientManifestOptions,
  type CreateServerManifestOptions,
} from '../../core/rsc'
import type {
  DecodeReplyOptions,
  PipeableStream,
  RenderToPipeableStreamOptions,
  RenderToReadableStreamOptions,
  ServerTemporaryReferenceSet,
} from '../../types'

export { loadServerAction, setRequireModule } from '../../core/rsc'

export function renderToReadableStream<T>(
  data: T,
  options?: RenderToReadableStreamOptions,
  extraOptions?: CreateClientManifestOptions,
): ReadableStream<Uint8Array> {
  return ReactServerNode.renderToReadableStream(
    data,
    createClientManifest({
      onClientReference: extraOptions?.onClientReference,
    }),
    options,
  )
}

export function renderToPipeableStream<T>(
  data: T,
  options?: RenderToPipeableStreamOptions,
  extraOptions?: CreateClientManifestOptions,
): PipeableStream {
  return ReactServerNode.renderToPipeableStream(
    data,
    createClientManifest({
      onClientReference: extraOptions?.onClientReference,
    }),
    options,
  )
}

export function registerClientReference<T>(
  proxy: T,
  id: string,
  name: string,
): T {
  return ReactServerNode.registerClientReference(proxy, id, name)
}

export const registerServerReference: <T>(
  ref: T,
  id: string,
  name: string,
) => T = ReactServerNode.registerServerReference

export function decodeReply(
  body: string | FormData,
  options?: DecodeReplyOptions,
  extraOptions?: CreateServerManifestOptions,
): Promise<unknown[]> {
  return ReactServerNode.decodeReply(
    body,
    createServerManifest(extraOptions),
    options,
  )
}

export function decodeReplyFromBusboy(
  body: import('node:stream').Writable, // BusBoy instance
  options?: DecodeReplyOptions,
  extraOptions?: CreateServerManifestOptions,
): Promise<unknown[]> {
  return ReactServerNode.decodeReplyFromBusboy(
    body,
    createServerManifest(extraOptions),
    options,
  )
}

// TODO: Expose decodeReplyFromAsyncIterable with a shared Edge/Node type.

export function decodeAction(
  body: FormData,
  extraOptions?: CreateServerManifestOptions,
): Promise<() => Promise<void>> {
  return ReactServerNode.decodeAction(body, createServerManifest(extraOptions))
}

export function decodeFormState(
  actionResult: unknown,
  body: FormData,
  extraOptions?: CreateServerManifestOptions,
): Promise<ReactFormState | undefined> {
  return ReactServerNode.decodeFormState(
    actionResult,
    body,
    createServerManifest(extraOptions),
  )
}

export const createTemporaryReferenceSet: () => ServerTemporaryReferenceSet =
  ReactServerNode.createTemporaryReferenceSet
