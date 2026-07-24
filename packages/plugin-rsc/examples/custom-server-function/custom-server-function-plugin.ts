import { getPluginApi } from '@vitejs/plugin-rsc'
import {
  hasDirective,
  transformDirectiveProxyExport,
  transformHoistInlineDirective,
  transformWrapExport,
} from '@vitejs/plugin-rsc/transforms'
import { parseAstAsync, type Plugin } from 'vite'

const directive = 'use custom-server'
const owner = 'example:use-custom-server'

// TODO: Give the custom directive observable runtime semantics so ownership
// swaps can assert the active registration path in addition to claim cleanup.
export function customServerFunctionPlugin(): Plugin {
  let manager: NonNullable<ReturnType<typeof getPluginApi>>['manager']

  return {
    name: 'example:custom-server-function',
    configResolved(config) {
      manager = getPluginApi(config)!.manager
    },
    async transform(code, id) {
      const environmentName = this.environment.name
      if (!code.includes(directive)) {
        if (environmentName === 'rsc') {
          manager.serverReferences.clearClaims(owner, id)
        } else {
          manager.serverReferences.replaceClaim(
            owner,
            environmentName,
            id,
            undefined,
          )
        }
        return
      }

      const reference = manager.serverReferences.resolve(id, 'rsc')
      const ast = (await parseAstAsync(code)) as unknown as Parameters<
        typeof transformHoistInlineDirective
      >[1]

      if (environmentName === 'rsc') {
        const runtime = (value: string, name: string) =>
          `$$CustomReactServer.registerServerReference(${value}, ${JSON.stringify(reference.referenceKey)}, ${JSON.stringify(name)})`
        const result = hasDirective(ast.body, directive)
          ? transformWrapExport(code, ast, {
              runtime,
              rejectNonAsyncFunction: true,
            })
          : transformHoistInlineDirective(code, ast, {
              directive,
              runtime,
              rejectNonAsyncFunction: true,
            })
        if (!result.output.hasChanged()) {
          manager.serverReferences.clearClaims(owner, id)
          return
        }

        manager.serverReferences.clearClaims(owner, id)
        manager.serverReferences.replaceClaim(owner, environmentName, id, {
          ...reference,
          exportNames: 'names' in result ? result.names : result.exportNames,
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
        manager.serverReferences.replaceClaim(
          owner,
          environmentName,
          id,
          undefined,
        )
        return
      }

      manager.serverReferences.replaceClaim(owner, environmentName, id, {
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
