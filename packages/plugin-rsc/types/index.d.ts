declare global {
  interface ImportMeta {
    readonly viteRsc: {
      loadCss: (importer?: string) => import('react').ReactNode
      loadModule: <T>(environmentName: string, entryName: string) => Promise<T>
      loadBootstrapScriptContent: (entryName: string) => Promise<string>
    }
  }

  interface ImportMetaEnv {
    readonly __vite_rsc_build__: boolean
  }
}

declare module 'vite' {
  interface UserConfig {
    /** Options for `@vitejs/plugin-rsc` */
    rsc?: import('@vitejs/plugin-rsc').RscPluginOptions
  }
}

export {}
