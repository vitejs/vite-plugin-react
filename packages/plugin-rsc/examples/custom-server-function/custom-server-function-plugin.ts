import { getPluginApi, type RscPluginManager } from '@vitejs/plugin-rsc'
import {
  hasDirective,
  transformDirectiveProxyExport,
  transformHoistInlineDirective,
  transformModuleExportEffect,
} from '@vitejs/plugin-rsc/transforms'
import { parseAstAsync, type Plugin } from 'vite'

const directive = 'use custom-server'
const pluginName = 'example:custom-server-function'

// This intentionally mirrors the built-in "use server" pipeline through the
// public integration APIs, but uses a separate directive and plugin name and
// omits export-all expansion and action encryption.
// TODO: Give the custom directive observable runtime semantics so ownership
// swaps can assert the active registration path in addition to claim cleanup.
export function customServerFunctionPlugin(): Plugin {
  let manager: RscPluginManager

  return {
    name: pluginName,
    configResolved(config) {
      manager = getPluginApi(config)!.manager
    },
    async transform(code, id) {
      const environmentName = this.environment.name
      if (!code.includes(directive)) {
        manager.serverReferences.deleteClaim(pluginName, id)
        return
      }

      const reference = manager.serverReferences.resolve(id, 'rsc')
      const ast = await parseAstAsync(code)

      if (environmentName === 'rsc') {
        const runtime = (value: string, name: string) =>
          `$$CustomReactServer.registerServerReference(${value}, ${JSON.stringify(reference.referenceKey)}, ${JSON.stringify(name)})`
        const result = hasDirective(ast.body, directive)
          ? transformModuleExportEffect(code, ast, {
              rejectNonAsyncFunction: true,
              generate: ({ binding, exportName }) =>
                runtime(binding, exportName),
            })
          : transformHoistInlineDirective(code, ast, {
              directive,
              runtime,
              rejectNonAsyncFunction: true,
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
          `import * as $$CustomReactServer from "@vitejs/plugin-rsc/react/rsc/server";\n`,
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
          `$$CustomReactClient.createServerReference(` +
          `${JSON.stringify(reference.referenceKey + '#' + name)},` +
          `$$CustomReactClient.callServer,` +
          `undefined,` +
          (this.environment.mode === 'dev'
            ? `$$CustomReactClient.findSourceMapURL,`
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
        `import * as $$CustomReactClient from "@vitejs/plugin-rsc/react/${runtimeEnvironment}";\n`,
      )
      return {
        code: result.output.toString(),
        map: result.output.generateMap({ hires: 'boundary' }),
      }
    },
  }
}
