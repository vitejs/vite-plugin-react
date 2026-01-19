import assert from 'node:assert'
import path from 'node:path'
import MagicString from 'magic-string'
import { stripLiteral } from 'strip-literal'
import { normalizePath, type Plugin } from 'vite'
import type { RscPluginManager } from '../plugin'
import { evalValue } from './vite-utils'

// Virtual module prefix for entry asset wrappers in dev mode
const ASSET_ENTRY_VIRTUAL_PREFIX = 'virtual:vite-rsc/asset-entry/'

export type AssetImportMeta = {
  resolvedId: string
  sourceEnv: string
  specifier: string
  isEntry: boolean
}

export function vitePluginImportAsset(manager: RscPluginManager): Plugin[] {
  return [
    {
      name: 'rsc:import-asset',
      resolveId(source) {
        // Handle virtual asset entry modules
        if (source.startsWith(ASSET_ENTRY_VIRTUAL_PREFIX)) {
          return '\0' + source
        }
      },
      async load(id) {
        // Handle virtual asset entry modules in dev mode
        if (id.startsWith('\0' + ASSET_ENTRY_VIRTUAL_PREFIX)) {
          assert(this.environment.mode === 'dev')
          const resolvedId = id.slice(
            ('\0' + ASSET_ENTRY_VIRTUAL_PREFIX).length,
          )

          let code = ''
          // Enable HMR only when react plugin is available
          const resolved = await this.resolve('/@react-refresh')
          if (resolved) {
            code += `
import RefreshRuntime from "/@react-refresh";
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
`
          }
          code += `await import(${JSON.stringify(resolvedId)});`
          // Server CSS cleanup on HMR
          code += /* js */ `
const ssrCss = document.querySelectorAll("link[rel='stylesheet']");
import.meta.hot.on("vite:beforeUpdate", () => {
  ssrCss.forEach(node => {
    if (node.dataset.precedence?.startsWith("vite-rsc/client-references")) {
      node.remove();
    }
  });
});
`
          // Close error overlay after syntax error is fixed
          code += `
import.meta.hot.on("rsc:update", () => {
  document.querySelectorAll("vite-error-overlay").forEach((n) => n.close())
});
`
          return code
        }
      },
      buildStart() {
        // Emit discovered entries during build
        if (this.environment.mode !== 'build') return
        if (this.environment.name !== 'client') return

        // Collect unique entries targeting client environment
        const emitted = new Set<string>()
        for (const metas of Object.values(manager.assetImportMetaMap)) {
          for (const meta of Object.values(metas)) {
            if (meta.isEntry && !emitted.has(meta.resolvedId)) {
              emitted.add(meta.resolvedId)
              this.emitFile({
                type: 'chunk',
                id: meta.resolvedId,
              })
            }
          }
        }
      },
      transform: {
        async handler(code, id) {
          if (!code.includes('import.meta.viteRsc.importAsset')) return

          const { server, config } = manager
          const s = new MagicString(code)

          for (const match of stripLiteral(code).matchAll(
            /import\.meta\.viteRsc\.importAsset\s*\(([\s\S]*?)\)/dg,
          )) {
            const [argStart, argEnd] = match.indices![1]!
            const argCode = code.slice(argStart, argEnd).trim()

            // Parse: ('./entry.browser.tsx', { entry: true })
            const [specifier, options]: [string, { entry?: boolean }?] =
              evalValue(`[${argCode}]`)
            const isEntry = options?.entry ?? false

            // Resolve specifier relative to importer against client environment
            let resolvedId: string
            if (this.environment.mode === 'dev') {
              const clientEnv = server.environments.client
              assert(clientEnv, `[vite-rsc] client environment not found`)
              const resolved = await clientEnv.pluginContainer.resolveId(
                specifier,
                id,
              )
              assert(
                resolved,
                `[vite-rsc] failed to resolve '${specifier}' for client environment`,
              )
              resolvedId = resolved.id
            } else {
              // Build mode: resolve in client environment config
              const clientEnvConfig = config.environments.client
              assert(clientEnvConfig, `[vite-rsc] client environment not found`)
              // Use this environment's resolver for now
              const resolved = await this.resolve(specifier, id)
              assert(
                resolved,
                `[vite-rsc] failed to resolve '${specifier}' for client environment`,
              )
              resolvedId = resolved.id
            }

            // Track discovered asset, keyed by [sourceEnv][resolvedId]
            const sourceEnv = this.environment.name
            manager.assetImportMetaMap[sourceEnv] ??= {}
            manager.assetImportMetaMap[sourceEnv]![resolvedId] = {
              resolvedId,
              sourceEnv,
              specifier,
              isEntry,
            }

            let replacement: string
            if (this.environment.mode === 'dev') {
              if (isEntry) {
                // Dev + entry: use virtual wrapper with HMR support
                const virtualId = ASSET_ENTRY_VIRTUAL_PREFIX + resolvedId
                const url = config.base + '@id/__x00__' + virtualId
                replacement = `Promise.resolve({ url: ${JSON.stringify(url)} })`
              } else {
                // Dev + non-entry: compute URL directly
                const relativePath = normalizePath(
                  path.relative(config.root, resolvedId),
                )
                const url = config.base + relativePath
                replacement = `Promise.resolve({ url: ${JSON.stringify(url)} })`
              }
            } else {
              // Build: use existing assets manifest
              // Use relative ID for stable builds across different machines
              const relativeId = manager.toRelativeId(resolvedId)
              replacement = `(async () => (await import("virtual:vite-rsc/assets-manifest")).default.importAssets[${JSON.stringify(relativeId)}])()`
            }

            const [start, end] = match.indices![0]!
            s.overwrite(start, end, replacement)
          }

          if (s.hasChanged()) {
            return {
              code: s.toString(),
              map: s.generateMap({ hires: 'boundary' }),
            }
          }
        },
      },
    },
  ]
}
