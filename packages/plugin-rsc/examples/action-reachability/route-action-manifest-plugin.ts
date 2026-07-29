import fs from 'node:fs'
import path from 'node:path'
import { getPluginApi, type RscPluginManager } from '@vitejs/plugin-rsc'
import { normalizePath, type Plugin } from 'vite'

const routes = {
  '/': './src/routes/home/page.tsx',
  '/other': './src/routes/other/page.tsx',
}

const ROUTE_ACTION_MANIFEST_ID = 'virtual:route-action-manifest'
const ROUTE_ACTION_MANIFEST_FILE = '__route_action_manifest.js'

export function routeActionManifestPlugin(): Plugin {
  let manager: RscPluginManager
  const routeClientReferenceKeys = new Map<string, Set<string>>()
  const routeDirectServerReferenceIds = new Map<string, Set<string>>()
  let routeActionManifest: Record<string, string[]> = {}

  return {
    name: 'route-action-manifest',
    configResolved(config) {
      manager = getPluginApi(config)!.manager
    },
    resolveId(source) {
      if (source === ROUTE_ACTION_MANIFEST_ID) {
        return this.environment.mode === 'build'
          ? { id: source, external: true }
          : '\0' + source
      }
    },
    load(id) {
      if (id === '\0' + ROUTE_ACTION_MANIFEST_ID) {
        return 'export default {}'
      }
    },
    generateBundle() {
      if (this.environment.name === 'rsc') {
        // Collect each route's direct actions and reachable Client Components.
        for (const [route, source] of Object.entries(routes)) {
          const clientReferenceKeys = new Set<string>()
          const directServerReferenceIds = new Set<string>()
          const visited = new Set<string>()
          const queue = [normalizePath(path.resolve(source))]
          for (let index = 0; index < queue.length; index++) {
            const id = queue[index]!
            if (visited.has(id)) continue
            visited.add(id)

            const clientReference = manager.clientReferenceMetaMap[id]
            if (clientReference) {
              clientReferenceKeys.add(clientReference.referenceKey)
            }

            const serverReference = manager.serverReferences.metaMap.get(id)
            if (serverReference) {
              for (const exportName of serverReference.exportNames) {
                directServerReferenceIds.add(
                  `${serverReference.referenceKey}#${exportName}`,
                )
              }
            }

            const info = this.getModuleInfo(id)
            if (info) {
              queue.push(...info.importedIds, ...info.dynamicallyImportedIds)
            }
          }
          routeClientReferenceKeys.set(route, clientReferenceKeys)
          routeDirectServerReferenceIds.set(route, directServerReferenceIds)
        }
        return
      }

      if (this.environment.name !== 'client') return
      // Join RSC route reachability with the final client graph relation.
      const reachabilityByReferenceKey = new Map(
        manager
          .getClientToServerReferenceReachability(this)
          .map((entry) => [entry.referenceKey, entry.serverReferenceIds]),
      )
      routeActionManifest = Object.fromEntries(
        Object.keys(routes).map((route) => {
          const actionIds = new Set(routeDirectServerReferenceIds.get(route))
          for (const referenceKey of routeClientReferenceKeys.get(route) ??
            []) {
            for (const actionId of reachabilityByReferenceKey.get(
              referenceKey,
            ) ?? []) {
              actionIds.add(actionId)
            }
          }
          return [route, [...actionIds].sort()]
        }),
      )
      this.emitFile({
        type: 'asset',
        fileName: 'route-action-manifest.json',
        source: JSON.stringify(routeActionManifest, null, 2),
      })
    },
    // Leave the virtual import external, then point it at an ESM sidecar
    // generated after the later client build.
    renderChunk(code, chunk) {
      if (code.includes(ROUTE_ACTION_MANIFEST_ID)) {
        let relativePath = path.posix.relative(
          path.posix.dirname(chunk.fileName),
          ROUTE_ACTION_MANIFEST_FILE,
        )
        if (!relativePath.startsWith('.')) {
          relativePath = './' + relativePath
        }
        return {
          code: code.replaceAll(ROUTE_ACTION_MANIFEST_ID, relativePath),
        }
      }
    },
    buildApp: {
      order: 'post',
      async handler(builder) {
        // The client graph is available only after the RSC output was emitted.
        const outDir = builder.config.environments.rsc.build.outDir
        await fs.promises.writeFile(
          path.join(outDir, ROUTE_ACTION_MANIFEST_FILE),
          `export default ${JSON.stringify(routeActionManifest, null, 2)}\n`,
        )
      },
    },
  }
}
