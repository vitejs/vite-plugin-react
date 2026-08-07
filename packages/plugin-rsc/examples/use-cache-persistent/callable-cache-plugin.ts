import { randomUUID } from 'node:crypto'
import { getPluginApi, type RscPluginManager } from '@vitejs/plugin-rsc'
import {
  hasDirective,
  type ModuleExportMeta,
  transformDirectiveProxyExport,
  transformHoistInlineDirective,
  transformWrapExport,
} from '@vitejs/plugin-rsc/transforms'
import { parseAstAsync, type EnvironmentModuleNode, type Plugin } from 'vite'
import type { CacheWrapperOptions } from './src/framework/use-cache-runtime'

const directive = 'use cache'
const pluginName = 'example:use-cache-persistent'

export function callableCachePlugin(): Plugin {
  let manager: RscPluginManager
  // A dev restart gets a new epoch, while an HMR update advances each affected
  // cache module's generation. Both enter the cache key so stale disk entries miss.
  const developmentEpoch = randomUUID()
  // TODO: An owner-aware `serverReferences.hasClaim()` could identify cache
  // modules during hot updates without using this map for membership as well.
  const cacheModuleGenerations = new Map<string, number>()

  return {
    name: pluginName,
    configResolved(config) {
      manager = getPluginApi(config)!.manager
    },
    async transform(code, id) {
      if (!code.includes(directive)) {
        manager.serverReferences.deleteClaim(pluginName, id)
        if (this.environment.name === 'rsc') {
          cacheModuleGenerations.delete(id)
        }
        return
      }

      const reference = manager.serverReferences.resolve(id, 'rsc')
      const ast = await parseAstAsync(code)
      const environmentName = this.environment.name

      if (environmentName === 'rsc') {
        const generation =
          this.environment.mode === 'dev'
            ? (cacheModuleGenerations.get(id) ?? 0) + 1
            : undefined
        if (generation !== undefined) {
          cacheModuleGenerations.set(id, generation)
        }
        const runtime = (
          value: string,
          name: string,
          meta: Pick<ModuleExportMeta, 'valueNode'>,
        ) => {
          const options: CacheWrapperOptions = {
            ...getCacheWrapperOptions(meta),
            cacheId: `${reference.referenceKey}#${name}`,
            generation:
              generation === undefined
                ? undefined
                : `${developmentEpoch}:${generation}`,
          }
          return (
            `$$ReactServer.registerServerReference(` +
            `$$cacheWrapper(${value}, ${JSON.stringify(options)}),` +
            `${JSON.stringify(reference.referenceKey)},` +
            `${JSON.stringify(name)})`
          )
        }
        const result = hasDirective(ast.body, directive)
          ? transformWrapExport(code, ast, {
              runtime: (value, name, meta) => runtime(value, name, meta),
              // Next.js calls rejecting primitive literals while permitting
              // objects and arrays arbitrary, but keeps the latter for metadata
              // and viewport exports.
              // https://github.com/vercel/next.js/blob/aae4179ac628e55483b62cd023a7e1827dcef122/crates/next-custom-transforms/src/transforms/server_actions.rs#L1914-L1919
              filter: (_name, meta) =>
                meta.valueNode?.type !== 'ObjectExpression' &&
                meta.valueNode?.type !== 'ArrayExpression',
              rejectNonAsyncFunction: true,
            })
          : transformHoistInlineDirective(code, ast, {
              directive,
              rejectNonAsyncFunction: true,
              hoistRuntime: true,
              runtime: (value, name, meta) => runtime(value, name, meta),
              encode: (value) => `$$encryptCacheCaptures(${value})`,
              // The cache runtime replaces the envelope with decoded captures
              // before invoking this private implementation.
              decode: (value) => value,
            })
        if (!result.output.hasChanged()) {
          manager.serverReferences.deleteClaim(pluginName, id)
          return
        }

        manager.serverReferences.replaceClaim(pluginName, id, {
          ...reference,
          exportNames: 'names' in result ? result.names : result.exportNames,
        })
        result.output.prepend(
          `import $$cacheWrapper, { encryptCacheCaptures as $$encryptCacheCaptures } from "/src/framework/use-cache-runtime";\n` +
            `import * as $$ReactServer from "@vitejs/plugin-rsc/react/rsc/server";\n`,
        )
        return {
          code: result.output.toString(),
          map: result.output.generateMap({ hires: 'boundary' }),
        }
      }

      const result = transformDirectiveProxyExport(ast, {
        code,
        directive,
        filter: (_name, meta) =>
          meta.valueNode?.type !== 'ObjectExpression' &&
          meta.valueNode?.type !== 'ArrayExpression',
        rejectNonAsyncFunction: true,
        runtime: (name) =>
          `$$ReactClient.createServerReference(` +
          `${JSON.stringify(reference.referenceKey + '#' + name)},` +
          `$$ReactClient.callServer,` +
          `undefined,` +
          (this.environment.mode === 'dev'
            ? `$$ReactClient.findSourceMapURL,`
            : `undefined,`) +
          `${JSON.stringify(name)})`,
      })
      if (!result?.output.hasChanged()) {
        manager.serverReferences.deleteClaim(pluginName, id)
        return
      }

      manager.serverReferences.replaceClaim(pluginName, id, {
        ...reference,
        exportNames: result.exportNames,
      })
      const runtimeEnvironment =
        environmentName === 'client' ? 'browser' : 'ssr'
      result.output.prepend(
        `import * as $$ReactClient from "@vitejs/plugin-rsc/react/${runtimeEnvironment}";\n`,
      )
      return {
        code: result.output.toString(),
        map: result.output.generateMap({ hires: 'boundary' }),
      }
    },
    hotUpdate(ctx) {
      if (this.environment.name !== 'rsc') return

      for (const module of collectImporters(ctx.modules)) {
        if (module.id && cacheModuleGenerations.has(module.id)) {
          this.environment.moduleGraph.invalidateModule(module)
        }
      }
    },
  }
}

function getCacheWrapperOptions(
  meta: Pick<ModuleExportMeta, 'valueNode'>,
): Pick<CacheWrapperOptions, 'argumentCount'> {
  const node = meta.valueNode
  if (
    node?.type !== 'FunctionDeclaration' &&
    node?.type !== 'FunctionExpression' &&
    node?.type !== 'ArrowFunctionExpression'
  ) {
    return {}
  }
  return node.params.at(-1)?.type === 'RestElement'
    ? {}
    : { argumentCount: node.params.length }
}

function collectImporters(
  roots: EnvironmentModuleNode[],
): Set<EnvironmentModuleNode> {
  const visited = new Set<EnvironmentModuleNode>()
  function visit(module: EnvironmentModuleNode) {
    if (visited.has(module)) return
    visited.add(module)
    for (const importer of module.importers) visit(importer)
  }
  for (const root of roots) visit(root)
  return visited
}
