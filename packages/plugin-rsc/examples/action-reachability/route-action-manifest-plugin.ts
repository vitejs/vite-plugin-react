import fs from 'node:fs'
import path from 'node:path'
import { getPluginApi, type RscPluginManager } from '@vitejs/plugin-rsc'
import { normalizePath, type Plugin, type Rollup } from 'vite'

// TODO: A framework would derive these graph roots from the runtime route
// convention. This example lists them again for simplicity.
const routes = {
  '/a': ['./src/app/root.tsx', './src/app/a/page.tsx'],
  '/b': ['./src/app/root.tsx', './src/app/b/page.tsx'],
}

const ROUTE_ACTION_MANIFEST_ID = 'virtual:route-action-manifest'
const ROUTE_ACTION_MANIFEST_FILE = '__route_action_manifest.js'

export function routeActionManifestPlugin(): Plugin {
  let manager: RscPluginManager
  const routeClientReferenceKeys = new Map<string, Set<string>>()
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
          const { clientReferenceKeys, serverReferenceIds } =
            collectReachableReferences(
              this,
              manager,
              roots.map((source) => normalizePath(path.resolve(source))),
            )
          routeClientReferenceKeys.set(route, clientReferenceKeys)
          routeServerReferenceIds.set(route, serverReferenceIds)
        }
      }

      if (this.environment.name === 'client') {
        // Join RSC route reachability with the final client graph relation.
        const clientReferenceKeyToServerReferenceIds: Map<
          string,
          Set<string>
        > = new Map()
        for (const clientReference of Object.values(
          manager.clientReferenceMetaMap,
        )) {
          const { serverReferenceIds } = collectReachableReferences(
            this,
            manager,
            [clientReference.importId],
          )
          clientReferenceKeyToServerReferenceIds.set(
            clientReference.referenceKey,
            serverReferenceIds,
          )
        }

        routeActionManifest = {}
        for (const route of Object.keys(routes)) {
          const actionIds = new Set(routeServerReferenceIds.get(route))
          for (const referenceKey of routeClientReferenceKeys.get(route) ??
            []) {
            for (const actionId of clientReferenceKeyToServerReferenceIds.get(
              referenceKey,
            ) ?? []) {
              actionIds.add(actionId)
            }
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
  const clientReferenceKeys = new Set<string>()
  const serverReferenceIds = new Set<string>()
  const visited = new Set<string>()
  const queue = [...roots]
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
        serverReferenceIds.add(`${serverReference.referenceKey}#${exportName}`)
      }
    }

    const info = context.getModuleInfo(id)
    if (info) {
      queue.push(...info.importedIds, ...info.dynamicallyImportedIds)
    }
  }
  return { clientReferenceKeys, serverReferenceIds }
}
