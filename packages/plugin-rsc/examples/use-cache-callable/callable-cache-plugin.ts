import { getPluginApi, type RscPluginManager } from '@vitejs/plugin-rsc'
import {
  hasDirective,
  type ModuleExportMeta,
  transformDirectiveProxyExport,
  transformHoistInlineDirective,
  transformWrapExport,
} from '@vitejs/plugin-rsc/transforms'
import { parseAstAsync, type Plugin } from 'vite'
import type { CacheWrapperOptions } from './src/framework/use-cache-runtime'

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
        const runtime = (
          value: string,
          name: string,
          options: CacheWrapperOptions,
        ) =>
          `$$CacheReactServer.registerServerReference(` +
          `$$cacheWrapper(${value}, ${JSON.stringify(options)}),` +
          `${JSON.stringify(reference.referenceKey)},` +
          `${JSON.stringify(name)})`
        const result = hasDirective(ast.body, directive)
          ? transformWrapExport(code, ast, {
              runtime: (value, name, meta) =>
                runtime(value, name, getCacheWrapperOptions(meta)),
              // Next.js calls rejecting primitive literals while permitting
              // objects and arrays arbitrary, but keeps the latter for metadata
              // and viewport exports.
              // https://github.com/vercel/next.js/blob/aae4179ac628e55483b62cd023a7e1827dcef122/crates/next-custom-transforms/src/transforms/server_actions.rs#L1914-L1919
              filter: (_name, meta) =>
                // Inline "use server" overrides the file-level cache role and
                // is left for the built-in transform.
                !hasFunctionDirective(meta, 'use server') &&
                meta.valueNode?.type !== 'ObjectExpression' &&
                meta.valueNode?.type !== 'ArrayExpression',
              rejectNonAsyncFunction: true,
            })
          : transformHoistInlineDirective(code, ast, {
              directive,
              rejectNonAsyncFunction: true,
              hoistRuntime: true,
              runtime: (value, name, meta) =>
                runtime(value, name, getCacheWrapperOptions(meta)),
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
        // Preserve leading directives so a later transform can still recognize
        // a file-level role such as "use server".
        const importPosition =
          ast.body.find((node) => !('directive' in node))?.start ?? code.length
        result.output.prependLeft(
          importPosition,
          `import $$cacheWrapper, { encryptCacheCaptures as $$encryptCacheCaptures } from "/src/framework/use-cache-runtime";\n` +
            `import * as $$CacheReactServer from "@vitejs/plugin-rsc/react/rsc/server";\n`,
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
          `$$CacheReactClient.createServerReference(` +
          `${JSON.stringify(reference.referenceKey + '#' + name)},` +
          `$$CacheReactClient.callServer,` +
          `undefined,` +
          (this.environment.mode === 'dev'
            ? `$$CacheReactClient.findSourceMapURL,`
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
        `import * as $$CacheReactClient from "@vitejs/plugin-rsc/react/${runtimeEnvironment}";\n`,
      )
      return {
        code: result.output.toString(),
        map: result.output.generateMap({ hires: 'boundary' }),
      }
    },
  }
}

function hasFunctionDirective(
  meta: Pick<ModuleExportMeta, 'valueNode'>,
  directive: string,
): boolean {
  const node = meta.valueNode
  if (
    (node?.type !== 'FunctionDeclaration' &&
      node?.type !== 'FunctionExpression' &&
      node?.type !== 'ArrowFunctionExpression') ||
    node.body.type !== 'BlockStatement'
  ) {
    return false
  }
  return node.body.body.some(
    (statement) =>
      statement.type === 'ExpressionStatement' &&
      'directive' in statement &&
      statement.directive === directive,
  )
}

function getCacheWrapperOptions(
  meta: Pick<ModuleExportMeta, 'valueNode'>,
): CacheWrapperOptions {
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
