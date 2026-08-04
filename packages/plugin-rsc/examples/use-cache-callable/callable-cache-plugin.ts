import { getPluginApi, type RscPluginManager } from '@vitejs/plugin-rsc'
import {
  hasDirective,
  transformDirectiveProxyExport,
  transformHoistInlineDirective,
  transformWrapExport,
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
        const runtime = (value: string, name: string) =>
          `$$ReactServer.registerServerReference(` +
          `$$cacheWrapper(${value}),` +
          `${JSON.stringify(reference.referenceKey)},` +
          `${JSON.stringify(name)})`
        const result = hasDirective(ast.body, directive)
          ? transformWrapExport(code, ast, {
              runtime,
              // Next.js permits object and array exports for metadata and
              // viewport values in "use cache" modules.
              filter: (_name, meta) =>
                meta.valueNode?.type !== 'ObjectExpression' &&
                meta.valueNode?.type !== 'ArrayExpression',
              rejectNonAsyncFunction: true,
            })
          : transformHoistInlineDirective(code, ast, {
              directive,
              rejectNonAsyncFunction: true,
              hoistRuntime: true,
              runtime,
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
