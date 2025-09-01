import type { Plugin } from 'vite'

// https://github.com/vercel/next.js/blob/90f564d376153fe0b5808eab7b83665ee5e08aaf/packages/next/src/build/webpack-config.ts#L1249-L1280
// https://github.com/pcattori/vite-env-only/blob/68a0cc8546b9a37c181c0b0a025eb9b62dbedd09/src/deny-imports.ts
// https://github.com/sveltejs/kit/blob/84298477a014ec471839adf7a4448d91bc7949e4/packages/kit/src/exports/vite/index.js#L513
export function validateImportPlugin(
  applyOptions: Pick<Plugin, 'apply'>,
): Plugin {
  return {
    name: 'rsc:validate-imports',
    ...applyOptions,
    resolveId: {
      order: 'pre',
      async handler(source, importer, options) {
        // optimizer is not aware of server/client boudnary so skip
        if ('scan' in options && options.scan) {
          return
        }

        // Validate client-only imports in server environments
        if (source === 'client-only') {
          if (this.environment.name === 'rsc') {
            throw new Error(
              `'client-only' cannot be imported in server build (importer: '${importer ?? 'unknown'}', environment: ${this.environment.name})`,
            )
          }
          return { id: `\0virtual:vite-rsc/empty`, moduleSideEffects: false }
        }
        if (source === 'server-only') {
          if (this.environment.name !== 'rsc') {
            throw new Error(
              `'server-only' cannot be imported in client build (importer: '${importer ?? 'unknown'}', environment: ${this.environment.name})`,
            )
          }
          return { id: `\0virtual:vite-rsc/empty`, moduleSideEffects: false }
        }

        return
      },
    },
    load(id) {
      if (id.startsWith('\0virtual:vite-rsc/empty')) {
        return `export {}`
      }
    },
  }
}
