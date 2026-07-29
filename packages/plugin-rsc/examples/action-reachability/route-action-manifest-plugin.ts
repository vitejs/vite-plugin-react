import fs from 'node:fs'
import path from 'node:path'
import { getPluginApi, type RscPluginManager } from '@vitejs/plugin-rsc'
import { normalizePath, type Plugin, type ResolvedConfig } from 'vite'

const routes = {
  '/': './src/routes/home/page.tsx',
  '/other': './src/routes/other/page.tsx',
}

const virtualRouteActionManifest = 'virtual:route-action-manifest'
const resolvedVirtualRouteActionManifest = `\0${virtualRouteActionManifest}`

export function routeActionManifestPlugin(): Plugin {
  let manager: RscPluginManager
  let config!: ResolvedConfig
  const routeClientReferenceKeys = new Map<string, Set<string>>()
  const routeDirectServerReferenceIds = new Map<string, Set<string>>()
  let routeActionManifest: Record<string, string[]> = {}

  return {
    name: 'route-action-manifest',
    configResolved(resolvedConfig) {
      config = resolvedConfig
      manager = getPluginApi(resolvedConfig)!.manager
    },
    resolveId(source) {
      if (source !== virtualRouteActionManifest) return
      if (this.environment.mode === 'build') {
        // The RSC output imports a sidecar written after the later client build.
        return { id: './route-action-manifest.js', external: true }
      }
      return resolvedVirtualRouteActionManifest
    },
    load(id) {
      if (id === resolvedVirtualRouteActionManifest) {
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
    buildApp: {
      order: 'post',
      async handler() {
        // The client graph is available only after the RSC output was emitted.
        const outDir = config.environments.rsc!.build.outDir
        fs.writeFileSync(
          path.join(outDir, 'route-action-manifest.js'),
          `export default ${JSON.stringify(routeActionManifest, null, 2)}\n`,
        )
      },
    },
  }
}
