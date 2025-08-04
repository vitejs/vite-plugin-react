export interface ImportManifestEntry {
  id: string
  name: string
  chunks: string[]
  async?: boolean
}

export type BundlerConfig = Record<string, ImportManifestEntry>

export type ModuleMap = Record<string, Record<string, ImportManifestEntry>>

export interface ServerConsumerManifest {
  moduleMap?: ModuleMap
  serverModuleMap?: BundlerConfig
  moduleLoading?: {
    prefix: string
    crossOriign?: string
  }
}

export type CallServerCallback = (id: string, args: unknown[]) => unknown
