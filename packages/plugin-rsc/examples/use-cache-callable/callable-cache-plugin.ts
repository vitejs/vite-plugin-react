import { getPluginApi, type RscPluginManager } from '@vitejs/plugin-rsc'
import {
  hasDirective,
  transformDirectiveProxyExport,
  transformHoistInlineDirective,
  transformModuleExportWrap,
} from '@vitejs/plugin-rsc/transforms'
import { parseAstAsync, type Plugin } from 'vite'

const directive = 'use cache'
const pluginName = 'example:use-cache-callable'

export function callableCachePlugin(): Plugin {
  let manager: RscPluginManager

  return {
    name: pluginName,
    configResolved(config) {
      manager = getPluginApi(config)!.manager
    },
    async transform(code, id) {
      if (!code.includes(directive)) {
        manager.serverReferences.deleteClaim(pluginName, id)
        return
      }

      const reference = manager.serverReferences.resolve(id, 'rsc')
      const ast = await parseAstAsync(code)
      const environmentName = this.environment.name

      if (environmentName === 'rsc') {
        const runtime = (value: string, name: string, originalName?: string) =>
          `$$ReactServer.registerServerReference(` +
          (originalName
            ? `Object.defineProperty($$cacheWrapper(${value}), "name", { value: ${JSON.stringify(originalName)} }),`
            : `$$cacheWrapper(${value}),`) +
          `${JSON.stringify(reference.referenceKey)},` +
          `${JSON.stringify(name)})`
        const result = hasDirective(ast.body, directive)
          ? transformModuleExportWrap(code, ast, {
              generate: ({ implementation, originalName, exportName }) =>
                runtime(implementation, exportName, originalName ?? exportName),
              rejectNonAsyncFunction: true,
            })
          : transformHoistInlineDirective(code, ast, {
              directive,
              rejectNonAsyncFunction: true,
              hoistRuntime: true,
              // TODO: Preserve the source function name once the inline hoist
              // runtime callback exposes it.
              runtime,
            })
        if (!result.output.hasChanged()) {
          manager.serverReferences.deleteClaim(pluginName, id)
          return
        }

        manager.serverReferences.replaceClaim(pluginName, id, {
          ...reference,
          exportNames: 'names' in result ? result.names : result.referenceNames,
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
  }
}
