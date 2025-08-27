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

export type PluginModuleMeta = {
  rsc: {
    type: 'client' | 'server'
  }
}
