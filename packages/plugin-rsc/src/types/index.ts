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

// Best-effort latest RSC API types
// https://github.com/wakujs/waku/blob/2ce74ee2381f6c0593b8246f33043434706889fe/packages/waku/src/lib/react-types.d.ts

export interface RenderToReadableStreamOptions {
  debugChannel?: { readable?: ReadableStream; writable?: WritableStream }
  environmentName?: string
  identifierPrefix?: string
  signal?: AbortSignal
  temporaryReferences?: ServerTemporaryReferenceSet
  onError?: (error: unknown) => void
  onPostpone?: (reason: string) => void
}

export interface CreateFromReadableStreamBrowserOptions {
  callServer?: CallServerCallback
  debugChannel?: { writable?: WritableStream; readable?: ReadableStream }
  findSourceMapURL?: (filename: string, environmentName: string) => string
  temporaryReferences?: ClientTemporaryReferenceSet
}

export interface CreateFromReadableStreamEdgeOptions {
  nonce?: string
  environmentName?: string
  replayConsoleLogs?: boolean
  temporaryReferences?: ClientTemporaryReferenceSet
}

export interface DecodeReplyOptions {
  temporaryReferences?: ServerTemporaryReferenceSet
}

export interface EncodeReplyOptions {
  temporaryReferences?: ClientTemporaryReferenceSet
}

// TODO: for now keep them unknown
// export type ServerTemporaryReferenceSet = WeakMap<object, string>
// export type ClientTemporaryReferenceSet = Map<unknown, unknown>
export type ServerTemporaryReferenceSet = unknown
export type ClientTemporaryReferenceSet = unknown
