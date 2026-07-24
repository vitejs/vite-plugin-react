// @ts-ignore
import * as ReactServer from '@vitejs/plugin-rsc/vendor/react-server-dom/server.edge'
import type { ReactFormState } from 'react-dom/client'
import {
  createClientManifest,
  createServerManifest,
  type CreateClientManifestOptions,
} from '../../core/rsc'
import type {
  DecodeReplyFunction,
  RenderToReadableStreamOptions,
  ServerTemporaryReferenceSet,
} from '../../types'

export { loadServerAction, setRequireModule } from '../../core/rsc'

export function renderToReadableStream<T>(
  data: T,
  options?: RenderToReadableStreamOptions,
  extraOptions?: CreateClientManifestOptions,
): ReadableStream<Uint8Array> {
  return ReactServer.renderToReadableStream(
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
