import './virtual'

declare global {
  interface ImportMeta {
    readonly viteRsc: {
      loadCss: (importer?: string) => import('react').ReactNode
      /** @deprecated use `loadModule("ssr", entry)` instead */
      loadSsrModule: <T>(entry: string) => Promise<T>
      loadModule: <T>(environmentName: string, entryName: string) => Promise<T>
      loadBootstrapScriptContent: (entryName: string) => Promise<string>
    }
  }

  interface ImportMetaEnv {
    readonly __vite_rsc_build__: boolean
  }
}

export {}
