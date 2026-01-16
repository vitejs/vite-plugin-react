declare global {
  interface ImportMeta {
    readonly viteRsc: {
      loadCss: (importer?: string) => import('react').ReactNode
      loadModule: <T>(environmentName: string, entryName?: string) => Promise<T>
      loadBootstrapScriptContent: (entryName: string) => Promise<string>
      /**
       * Import a module from another environment using a module specifier.
       *
       * A more ergonomic alternative to `loadModule` that takes a relative path
       * instead of an entry name, so the specifier matches what you'd use in
       * `typeof import(...)` type annotations.
       *
       * @example
       * ```ts
       * const ssr = await import.meta.viteRsc.import<typeof import('./entry.ssr')>(
       *   './entry.ssr',
       *   { environment: 'ssr' }
       * );
       * ```
       *
       * @param specifier - Relative path to the module (e.g., './entry.ssr')
       * @param options - Options object with `environment` specifying the target environment
       * @returns Promise resolving to the module exports
       */
      import: <T>(
        specifier: string,
        options: { environment: string },
      ) => Promise<T>
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
