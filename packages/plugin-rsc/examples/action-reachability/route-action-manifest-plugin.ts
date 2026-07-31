import fs from 'node:fs'
import path from 'node:path'
import { getPluginApi, type RscPluginManager } from '@vitejs/plugin-rsc'
import { normalizePath, type Plugin, type Rollup } from 'vite'

// TODO: A framework would derive these graph roots from the runtime route
// convention. This example lists them again for simplicity.
const routes = {
  '/a': ['./src/app/root.tsx', './src/app/a/page.tsx'],
  '/b': ['./src/app/root.tsx', './src/app/b/page.tsx'],
  '/c': ['./src/app/root.tsx', './src/app/c/page.tsx'],
}

const ROUTE_ACTION_MANIFEST_ID = 'virtual:route-action-manifest'
const ROUTE_ACTION_MANIFEST_FILE = '__route_action_manifest.js'

export function routeActionManifestPlugin(): Plugin {
  let manager: RscPluginManager
  const routeClientReferenceImportIds = new Map<string, Set<string>>()
  const routeServerReferenceIds = new Map<string, Set<string>>()
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
        return 'export default null'
      }
    },
    generateBundle() {
      if (manager.isScanBuild) return

      if (this.environment.name === 'rsc') {
        // Collect references reachable in each route's RSC graph.
        for (const [route, roots] of Object.entries(routes)) {
          const { clientReferenceImportIds, serverReferenceIds } =
            collectReachableReferences(
              this,
              manager,
              roots.map((source) => normalizePath(path.resolve(source))),
            )
          routeClientReferenceImportIds.set(route, clientReferenceImportIds)
          routeServerReferenceIds.set(route, serverReferenceIds)
        }
      }

      if (this.environment.name === 'client') {
        // Join RSC route reachability with the final client graph relation.
        // Multi-root traversal visits shared modules once per route rather than
        // once per Client Component root: O(routes * (modules + imports)).
        routeActionManifest = {}
        for (const route of Object.keys(routes)) {
          const actionIds = new Set(routeServerReferenceIds.get(route))
          const clientReferenceImportIds =
            routeClientReferenceImportIds.get(route) ?? []
          const { serverReferenceIds } = collectReachableReferences(
            this,
            manager,
            [...clientReferenceImportIds],
          )
          for (const actionId of serverReferenceIds) {
            actionIds.add(actionId)
          }
          routeActionManifest[route] = [...actionIds].sort()
        }
      }
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

function collectReachableReferences(
  context: Rollup.PluginContext,
  manager: RscPluginManager,
  roots: string[],
) {
  const clientReferenceImportIds = new Set<string>()
  const serverReferenceIds = new Set<string>()
  const visited = new Set<string>()
  const queue = [...roots]
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index]!
    if (visited.has(id)) continue
    visited.add(id)

    const clientReference = manager.clientReferenceMetaMap[id]
    if (clientReference) {
      clientReferenceImportIds.add(clientReference.importId)
    }

    const serverReference = manager.serverReferences.metaMap.get(id)
    if (serverReference) {
      for (const exportName of serverReference.exportNames) {
        serverReferenceIds.add(`${serverReference.referenceKey}#${exportName}`)
      }
    }

    const info = context.getModuleInfo(id)
    if (info) {
      queue.push(...info.importedIds, ...info.dynamicallyImportedIds)
    }
  }
  return { clientReferenceImportIds, serverReferenceIds }
}
