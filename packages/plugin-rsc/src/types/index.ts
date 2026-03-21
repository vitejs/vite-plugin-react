export interface ImportManifestEntry {
  id: string
  name: string
  chunks: string[]
  async?: boolean
}

export interface BundlerConfig {
  [bundlerId: string]: ImportManifestEntry
}

export type ModuleMap = {
  [id: string]: {
    [exportName: string]: ImportManifestEntry
  }
}

export interface ServerConsumerManifest {
  moduleMap?: ModuleMap
  serverModuleMap?: BundlerConfig
  moduleLoading?: {
    prefix: string
    crossOriign?: string
  }
}

export type CallServerCallback = (id: string, args: unknown[]) => unknown

// Best-effort latest RSC API types based on react-server-dom-webpack
// https://github.com/wakujs/waku/blob/2ce74ee2381f6c0593b8246f33043434706889fe/packages/waku/src/lib/react-types.d.ts

export type ServerTemporaryReferenceSet = WeakMap<object, string>
export type ClientTemporaryReferenceSet = Map<unknown, unknown>

// react-server-dom/server.edge

export interface RenderToReadableStreamOptions {
  debugChannel?: { readable?: ReadableStream; writable?: WritableStream }
  environmentName?: string
  identifierPrefix?: string
  signal?: AbortSignal
  temporaryReferences?: ServerTemporaryReferenceSet
  onError?: (error: unknown) => void
  onPostpone?: (reason: string) => void
}

export interface DecodeReplyOptions {
  temporaryReferences?: ServerTemporaryReferenceSet
}

// react-server-dom/client (browser)

export interface CreateFromReadableStreamCsrOptions {
  callServer?: CallServerCallback
  debugChannel?: { writable?: WritableStream; readable?: ReadableStream }
  findSourceMapURL?: (filename: string, environmentName: string) => string
  temporaryReferences?: ClientTemporaryReferenceSet
}

export interface EncodeReplyOptions {
  temporaryReferences?: ClientTemporaryReferenceSet
}

// react-server-dom/client.edge

export interface CreateFromReadableStreamSsrOptions {
  nonce?: string
}
