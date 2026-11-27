// @ts-ignore
import * as ReactClient from '@vitejs/plugin-rsc/vendor/react-server-dom/client.browser'
import type {
  CallServerCallback,
  ClientTemporaryReferenceSet,
  CreateFromReadableStreamBrowserOptions,
  EncodeReplyFunction,
} from '../types'

export { setRequireModule } from '../core/browser'

export function createFromReadableStream<T>(
  stream: ReadableStream<Uint8Array>,
  options: CreateFromReadableStreamBrowserOptions = {},
): Promise<T> {
  return ReactClient.createFromReadableStream(stream, {
    callServer,
    findSourceMapURL,
    ...options,
  })
}

export function createFromFetch<T>(
  promiseForResponse: Promise<Response>,
  options: CreateFromReadableStreamBrowserOptions = {},
): Promise<T> {
  return ReactClient.createFromFetch(promiseForResponse, {
    callServer,
    findSourceMapURL,
    ...options,
  })
}

export const encodeReply: EncodeReplyFunction = ReactClient.encodeReply

export const createServerReference: (...args: any[]) => unknown =
  ReactClient.createServerReference

// use global instead of local variable  to tolerate duplicate modules
// e.g. when `setServerCallback` is pre-bundled but `createServerReference` is not

export function callServer(...args: any[]): any {
  return (globalThis as any).__viteRscCallServer(...args)
}

export function setServerCallback(fn: CallServerCallback): void {
  ;(globalThis as any).__viteRscCallServer = fn
}

export type { CallServerCallback }

export const createTemporaryReferenceSet: () => ClientTemporaryReferenceSet =
  ReactClient.createTemporaryReferenceSet

export function findSourceMapURL(
  filename: string,
  environmentName: string,
): string | null {
  // TODO: respect config.base?
  const url = new URL(
    /* @vite-ignore */ '/__vite_rsc_findSourceMapURL',
    import.meta.url,
  )
  url.searchParams.set('filename', filename)
  url.searchParams.set('environmentName', environmentName)
  return url.toString()
}
