import { resolveReactServerDom } from '../utils/resolve-react-server-dom'
import type { ReactFormState } from 'react-dom/client'
import {
  createClientManifest,
  createServerDecodeClientManifest,
  createServerManifest,
} from '../core/rsc'

// @ts-ignore
const ReactClient = await import(
  /* @vite-ignore */ resolveReactServerDom('client.edge.js')
)
// @ts-ignore
const ReactServer = await import(
  /* @vite-ignore */ resolveReactServerDom('server.edge.js')
)

export { loadServerAction, setRequireModule } from '../core/rsc'

export function renderToReadableStream<T>(
  data: T,
  options?: object,
): ReadableStream<Uint8Array> {
  return ReactServer.renderToReadableStream(
    data,
    createClientManifest(),
    options,
  )
}

export function createFromReadableStream<T>(
  stream: ReadableStream<Uint8Array>,
  options: object = {},
): Promise<T> {
  return ReactClient.createFromReadableStream(stream, {
    serverConsumerManifest: {
      // https://github.com/facebook/react/pull/31300
      // https://github.com/vercel/next.js/pull/71527
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

export function decodeReply(
  body: string | FormData,
  options?: unknown,
): Promise<unknown[]> {
  return ReactServer.decodeReply(body, createServerManifest(), options)
}

export function decodeAction(body: FormData): Promise<() => Promise<void>> {
  return ReactServer.decodeAction(body, createServerManifest())
}

export function decodeFormState(
  actionResult: unknown,
  body: FormData,
): Promise<ReactFormState | undefined> {
  return ReactServer.decodeFormState(actionResult, body, createServerManifest())
}

export const createTemporaryReferenceSet: () => unknown =
  ReactServer.createTemporaryReferenceSet

export const encodeReply: (
  v: unknown[],
  options?: unknown,
) => Promise<string | FormData> = ReactClient.encodeReply

export const createClientTemporaryReferenceSet: () => unknown =
  ReactClient.createTemporaryReferenceSet
