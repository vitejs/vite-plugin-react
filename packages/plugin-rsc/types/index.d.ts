declare global {
  interface ImportMeta {
    readonly viteRsc: {
      loadCss: (importer?: string) => import('react').ReactNode
      loadModule: <T>(environmentName: string, entryName?: string) => Promise<T>
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

  interface ViteBuilder {
    /**
     * RSC plugin API exposed for custom build pipelines.
     * Available when using `rsc({ customBuildApp: true })`.
     * @experimental
     */
    rsc: {
      /** Access to internal RscPluginManager for controlling build phases */
      manager: import('@vitejs/plugin-rsc').RscPluginManager
    }
  }
}

export {}
