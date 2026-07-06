import { exactRegex } from '@rolldown/pluginutils'
import * as esModuleLexer from 'es-module-lexer'
import { walk } from 'estree-walker'
import { parseAstAsync, type Plugin } from 'vite'
import type { RscPluginManager } from '../plugin'

type ScanBuildModule = {
  code: string
  imports: readonly esModuleLexer.ImportSpecifier[]
  exports: readonly esModuleLexer.ExportSpecifier[]
}

const scanBuildModulesMap = new WeakMap<
  RscPluginManager,
  Map<string, ScanBuildModule>
>()

// During scan build, we strip all code but imports to
// traverse module graph faster and just discover client/server references.
export function scanBuildStripPlugin({
  manager,
}: {
  manager: RscPluginManager
}): Plugin {
  let scanBuildModules = scanBuildModulesMap.get(manager)
  if (!scanBuildModules) {
    scanBuildModules = new Map()
    scanBuildModulesMap.set(manager, scanBuildModules)
  }
  return {
    name: 'rsc:scan-strip',
    apply: 'build',
    enforce: 'post',
    buildStart() {
      if (manager.isScanBuild && manager.scanBuildObservers.size > 0) {
        scanBuildModules.clear()
        for (const observer of manager.scanBuildObservers) {
          observer({
            type: 'reset',
            environmentName: this.environment.name,
          })
        }
      }
    },
    transform: {
      filter: {
        id: { exclude: exactRegex('\0rolldown/runtime.js') },
      },
      async handler(code, id, _options) {
        if (!manager.isScanBuild) return
        return {
          code: await transformScanBuildStrip(
            code,
            manager.scanBuildObservers.size > 0
              ? (imports, exports) => {
                  if (!scanBuildModules.has(id)) {
                    scanBuildModules.set(id, {
                      code,
                      imports,
                      exports,
                    })
                  }
                }
              : undefined,
          ),
          map: { mappings: '' },
        }
      },
    },
    moduleParsed(info) {
      if (!manager.isScanBuild || manager.scanBuildObservers.size === 0) return
      const lexed = scanBuildModules.get(info.id)
      if (!lexed) return
      scanBuildModules.delete(info.id)
      for (const observer of manager.scanBuildObservers) {
        observer({
          type: 'module',
          environmentName: this.environment.name,
          info,
          ...lexed,
        })
      }
    },
  }
}

// https://github.com/vitejs/vite/blob/86d2e8be50be535494734f9f5f5236c61626b308/packages/vite/src/node/plugins/importMetaGlob.ts#L113
const importGlobRE = /\bimport\.meta\.glob(?:<\w+>)?\s*\(/g

export async function transformScanBuildStrip(
  code: string,
  onLexed?: (
    imports: readonly esModuleLexer.ImportSpecifier[],
    exports: readonly esModuleLexer.ExportSpecifier[],
  ) => void | Promise<void>,
): Promise<string> {
  const [imports, exports] = esModuleLexer.parse(code)
  await onLexed?.(imports, exports)
  let output = imports
    .map((e) => e.n && `import ${JSON.stringify(e.n)};\n`)
    .filter(Boolean)
    .join('')

  // preserve import.meta.glob for rolldown-vite
  // https://github.com/vitejs/rolldown-vite/issues/373
  if (importGlobRE.test(code)) {
    const ast = await parseAstAsync(code)
    walk(ast, {
      enter(node) {
        if (
          node.type === 'CallExpression' &&
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'MetaProperty' &&
          node.callee.object.meta.type === 'Identifier' &&
          node.callee.object.meta.name === 'import' &&
          node.callee.object.property.type === 'Identifier' &&
          node.callee.object.property.name === 'meta' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'glob'
        ) {
          const importMetaGlob = code.slice(node.start, node.end)
          output += `console.log(${importMetaGlob});\n`
        }
      },
    })
    output += ''
  }

  return output
}
