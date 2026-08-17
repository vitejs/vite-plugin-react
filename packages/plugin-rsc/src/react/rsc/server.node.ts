// @ts-ignore
import * as ReactServerNode from '@vitejs/plugin-rsc/vendor/react-server-dom/server.node'
import type { ReactFormState } from 'react-dom/client'
import {
  createClientManifest,
  createServerManifest,
  type CreateClientManifestOptions,
} from '../../core/rsc'
import type {
  DecodeReplyFromBusboyFunction,
  DecodeReplyFunction,
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

export const decodeReply: DecodeReplyFunction = (body, options) =>
  ReactServerNode.decodeReply(body, createServerManifest(), options)

export const decodeReplyFromBusboy: DecodeReplyFromBusboyFunction = (
  body,
  options,
) =>
  ReactServerNode.decodeReplyFromBusboy(body, createServerManifest(), options)

// TODO: Expose decodeReplyFromAsyncIterable with a shared Edge/Node type.

export function decodeAction(body: FormData): Promise<() => Promise<void>> {
  return ReactServerNode.decodeAction(body, createServerManifest())
}

export function decodeFormState(
  actionResult: unknown,
  body: FormData,
): Promise<ReactFormState | undefined> {
  return ReactServerNode.decodeFormState(
    actionResult,
    body,
    createServerManifest(),
  )
}

export const createTemporaryReferenceSet: () => ServerTemporaryReferenceSet =
  ReactServerNode.createTemporaryReferenceSet
