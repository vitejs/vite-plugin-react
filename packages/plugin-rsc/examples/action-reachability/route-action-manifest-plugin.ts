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
const SERVER_REFERENCES_ID = 'virtual:route-server-references'
const SERVER_REFERENCES_FILE = '__server_references.js'
const ROUTE_DEPLOYMENTS_ID = 'virtual:route-deployments'
const ROUTE_DEPLOYMENTS_FILE = '__route_deployments.js'

export function routeActionManifestPlugin(): Plugin {
  let manager: RscPluginManager
  const emittedServerReferences = new Map<string, string>()
  const serverReferenceChunks = new Map<string, string>()
  const routeClientReferenceImportIds = new Map<string, Set<string>>()
  const routeServerReferenceIds = new Map<string, Set<string>>()
  let routeActionManifest: Record<string, string[]> = {}

  return {
    name: 'route-action-manifest',
    configResolved(config) {
      manager = getPluginApi(config)!.manager
    },
    buildStart() {
      if (
        manager.isScanBuild ||
        this.environment.mode !== 'build' ||
        this.environment.name !== 'rsc'
      ) {
        return
      }
      emittedServerReferences.clear()
      for (const meta of manager.serverReferences.metaMap.values()) {
        emittedServerReferences.set(
          meta.referenceKey,
          this.emitFile({
            type: 'chunk',
            id: meta.importId,
            name: `server-reference-${meta.referenceKey}`,
            preserveSignature: 'strict',
          }),
        )
      }
    },
    resolveId(source) {
      if (
        source === ROUTE_ACTION_MANIFEST_ID ||
        source === SERVER_REFERENCES_ID ||
        source === ROUTE_DEPLOYMENTS_ID
      ) {
        return this.environment.mode === 'build'
          ? { id: source, external: true }
          : '\0' + source
      }
    },
    load(id) {
      if (id === '\0' + ROUTE_ACTION_MANIFEST_ID) {
        return 'export default null'
      }
      if (id === '\0' + SERVER_REFERENCES_ID) {
        return 'export default {}'
      }
      if (id === '\0' + ROUTE_DEPLOYMENTS_ID) {
        const entry = JSON.stringify(
          normalizePath(path.resolve('./src/framework/entry.rsc.tsx')),
        )
        return `const load = () => import(${entry}); export default { '/a': load, '/b': load }`
      }
    },
    generateBundle() {
      if (manager.isScanBuild) return

      if (this.environment.name === 'rsc') {
        serverReferenceChunks.clear()
        for (const [referenceKey, emittedId] of emittedServerReferences) {
          serverReferenceChunks.set(referenceKey, this.getFileName(emittedId))
        }

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
      const replacements = [
        [ROUTE_ACTION_MANIFEST_ID, ROUTE_ACTION_MANIFEST_FILE],
        [SERVER_REFERENCES_ID, SERVER_REFERENCES_FILE],
        [ROUTE_DEPLOYMENTS_ID, ROUTE_DEPLOYMENTS_FILE],
      ] as const
      for (const [id, fileName] of replacements) {
        if (code.includes(id)) {
          let relativePath = path.posix.relative(
            path.posix.dirname(chunk.fileName),
            fileName,
          )
          if (!relativePath.startsWith('.')) {
            relativePath = './' + relativePath
          }
          code = code.replaceAll(id, relativePath)
        }
      }
      return { code }
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
        await fs.promises.writeFile(
          path.join(outDir, SERVER_REFERENCES_FILE),
          renderServerReferences(
            serverReferenceChunks.keys(),
            serverReferenceChunks,
          ),
        )

        const deploymentsDir = path.join(outDir, 'deployments')
        await fs.promises.rm(deploymentsDir, { recursive: true, force: true })
        for (const [route, actionIds] of Object.entries(routeActionManifest)) {
          const deploymentDir = path.join(
            deploymentsDir,
            routeDeploymentName(route),
          )
          const rscDir = path.join(deploymentDir, 'rsc')
          await fs.promises.mkdir(rscDir, { recursive: true })
          const referenceKeys = new Set(
            actionIds.map((actionId) => actionId.split('#')[0]!),
          )
          const files = collectChunkClosure(manager.bundles.rsc, [
            'handler.js',
            ...[...referenceKeys].map((key) => serverReferenceChunks.get(key)!),
          ])
          for (const fileName of files) {
            const destination = path.join(rscDir, fileName)
            await fs.promises.mkdir(path.dirname(destination), {
              recursive: true,
            })
            await fs.promises.copyFile(path.join(outDir, fileName), destination)
          }
          await fs.promises.copyFile(
            path.join(outDir, ROUTE_ACTION_MANIFEST_FILE),
            path.join(rscDir, ROUTE_ACTION_MANIFEST_FILE),
          )
          await fs.promises.writeFile(
            path.join(rscDir, SERVER_REFERENCES_FILE),
            renderServerReferences(referenceKeys, serverReferenceChunks),
          )
          await fs.promises.cp(
            builder.config.environments.ssr.build.outDir,
            path.join(deploymentDir, 'ssr'),
            { recursive: true },
          )
        }
        await fs.promises.writeFile(
          path.join(outDir, ROUTE_DEPLOYMENTS_FILE),
          `export default {\n${Object.keys(routes)
            .map(
              (route) =>
                `  ${JSON.stringify(route)}: () => import(${JSON.stringify(`./deployments/${routeDeploymentName(route)}/rsc/handler.js`)}),`,
            )
            .join('\n')}\n}\n`,
        )
      },
    },
  }
}

function routeDeploymentName(route: string) {
  return route === '/' ? '%2F' : encodeURIComponent(route.slice(1))
}

function renderServerReferences(
  referenceKeys: Iterable<string>,
  referenceImports: Map<string, string>,
  relative = true,
) {
  let code = ''
  for (const referenceKey of referenceKeys) {
    let importId = referenceImports.get(referenceKey)!
    if (relative) importId = './' + importId
    code += `  ${JSON.stringify(referenceKey)}: () => import(${JSON.stringify(importId)}),\n`
  }
  return `export default {\n${code}}\n`
}

function collectChunkClosure(
  bundle: Rollup.OutputBundle,
  roots: string[],
): Set<string> {
  const files = new Set<string>()
  const queue = [...roots]
  for (let index = 0; index < queue.length; index++) {
    const fileName = queue[index]!
    if (files.has(fileName)) continue
    const output = bundle[fileName]
    if (!output) continue
    files.add(fileName)
    if (output?.type === 'chunk') {
      queue.push(...output.imports, ...output.dynamicImports)
      if (output.viteMetadata) {
        queue.push(
          ...output.viteMetadata.importedAssets,
          ...output.viteMetadata.importedCss,
        )
      }
    }
  }
  return files
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
