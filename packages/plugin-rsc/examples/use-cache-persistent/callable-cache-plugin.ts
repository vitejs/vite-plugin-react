import { randomUUID } from 'node:crypto'
import { getPluginApi, type RscPluginManager } from '@vitejs/plugin-rsc'
import {
  hasDirective,
  transformDirectiveProxyExport,
  transformWrapExport,
} from '@vitejs/plugin-rsc/transforms'
import { parseAstAsync, type EnvironmentModuleNode, type Plugin } from 'vite'
import type { CacheWrapperOptions } from './src/framework/use-cache-runtime'

const directive = 'use cache'
const pluginName = 'example:use-cache-persistent'

export function callableCachePlugin(): Plugin {
  let manager: RscPluginManager
  const developmentEpoch = randomUUID()
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
      if (!hasDirective(ast.body, directive)) {
        manager.serverReferences.deleteClaim(pluginName, id)
        if (environmentName === 'rsc') cacheModuleGenerations.delete(id)
        return
      }

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
          options: CacheWrapperOptions,
        ) =>
          `$$ReactServer.registerServerReference(` +
          `$$cacheWrapper(${value}, ${JSON.stringify(options)}),` +
          `${JSON.stringify(reference.referenceKey)},` +
          `${JSON.stringify(name)})`
        const result = transformWrapExport(code, ast, {
          runtime: (value, name) =>
            runtime(value, name, {
              cacheId: `${reference.referenceKey}#${name}`,
              generation:
                generation === undefined
                  ? undefined
                  : `${developmentEpoch}:${generation}`,
            }),
          rejectNonAsyncFunction: true,
        })
        if (!result.output.hasChanged()) {
          manager.serverReferences.deleteClaim(pluginName, id)
          return
        }

        manager.serverReferences.replaceClaim(pluginName, id, {
          ...reference,
          exportNames: result.exportNames,
        })
        result.output.prepend(
          `import $$cacheWrapper from "/src/framework/use-cache-runtime";\n` +
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
