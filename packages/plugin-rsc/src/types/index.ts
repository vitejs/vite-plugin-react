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

// https://github.com/facebook/react/blob/8b2e903a7447d370eb77bb117bc4c0ae240ce831/packages/react-server-dom-webpack/src/server/ReactFlightDOMServerEdge.js#L64-L73
export interface RenderToReadableStreamOptions {
  debugChannel?: DebugChannel
  environmentName?: string | (() => string)
  filterStackFrame?: (url: string, functionName: string) => boolean
  identifierPrefix?: string
  signal?: AbortSignal
  startTime?: number
  temporaryReferences?: ServerTemporaryReferenceSet
  onError?: (error: unknown) => void
}

// https://github.com/facebook/react/blob/8b2e903a7447d370eb77bb117bc4c0ae240ce831/packages/react-server-dom-webpack/src/client/ReactFlightDOMClientBrowser.js#L47-L57
export interface CreateFromReadableStreamBrowserOptions {
  debugChannel?: DebugChannel
  endTime?: number
  environmentName?: string
  replayConsoleLogs?: boolean
  startTime?: number
  temporaryReferences?: ClientTemporaryReferenceSet
}

// https://github.com/facebook/react/blob/8b2e903a7447d370eb77bb117bc4c0ae240ce831/packages/react-server-dom-webpack/src/client/ReactFlightDOMClientEdge.js#L74-L87
export interface CreateFromReadableStreamEdgeOptions {
  debugChannel?: DebugChannel
  endTime?: number
  environmentName?: string
  nonce?: string
  replayConsoleLogs?: boolean
  startTime?: number
  temporaryReferences?: ClientTemporaryReferenceSet
}

// https://github.com/facebook/react/blob/8b2e903a7447d370eb77bb117bc4c0ae240ce831/packages/react-server-dom-webpack/src/server/ReactFlightDOMServerEdge.js#L247-L253
export interface DecodeReplyOptions {
  temporaryReferences?: ServerTemporaryReferenceSet
  arraySizeLimit?: number
}

// https://github.com/facebook/react/blob/8b2e903a7447d370eb77bb117bc4c0ae240ce831/packages/react-server-dom-webpack/src/client/ReactFlightDOMClientBrowser.js#L261-L263
export interface EncodeReplyOptions {
  temporaryReferences?: ClientTemporaryReferenceSet
  signal?: AbortSignal
}

type DebugChannel = {
  readable?: ReadableStream<Uint8Array>
  writable?: WritableStream<Uint8Array>
}

// TODO: for now keep them unknown
// export type ServerTemporaryReferenceSet = WeakMap<object, string>
// export type ClientTemporaryReferenceSet = Map<unknown, unknown>
export type ServerTemporaryReferenceSet = unknown
export type ClientTemporaryReferenceSet = unknown
