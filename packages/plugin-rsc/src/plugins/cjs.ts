import { parseAstAsync, type Plugin } from 'vite'
import { parseIdQuery } from './utils'
import { findClosestPkgJsonPath } from 'vitefu'
import path from 'node:path'
import fs from 'node:fs'
import * as esModuleLexer from 'es-module-lexer'
import { transformCjsToEsm } from '../transforms/cjs'
import { createDebug } from '@hiogawa/utils'

const debug = createDebug('vite-rsc:cjs')

export function cjsModuleRunnerPlugin(): Plugin[] {
  // use-sync-external-store is known to work fine so don't show warning
  const warnedPackages = new Set<string>(['use-sync-external-store'])

  return [
    {
      name: 'cjs-module-runner-transform',
      apply: 'serve',
      applyToEnvironment: (env) => env.config.dev.moduleRunnerTransform,
      async transform(code, id) {
        if (
          id.includes('/node_modules/') &&
          !id.startsWith(this.environment.config.cacheDir) &&
          /\b(require|exports)\b/.test(code)
        ) {
          id = parseIdQuery(id).filename
          if (!/\.[cm]?js$/.test(id)) return

          // skip genuine esm
          if (id.endsWith('.mjs')) return
          if (id.endsWith('.js')) {
            const pkgJsonPath = await findClosestPkgJsonPath(path.dirname(id))
            if (pkgJsonPath) {
              const pkgJson = JSON.parse(
                fs.readFileSync(pkgJsonPath, 'utf-8'),
              ) as { type?: string }
              if (pkgJson.type === 'module') return
            }
          }

          // skip faux esm (e.g. from "module" field)
          const [, , , hasModuleSyntax] = esModuleLexer.parse(code)
          if (hasModuleSyntax) return

          // warning once per package
          const packageKey = extractPackageKey(id)
          if (!warnedPackages.has(packageKey)) {
            debug(
              `Found non-optimized CJS dependency in '${this.environment.name}' environment. ` +
                `It is recommended to add the dependency to 'environments.${this.environment.name}.optimizeDeps.include'.`,
            )
            warnedPackages.add(packageKey)
          }

          const ast = await parseAstAsync(code)
          const result = transformCjsToEsm(code, ast)
          const output = result.output
          // TODO: can we use cjs-module-lexer to properly define named exports?
          // for re-exports, we need to eagerly transform dependencies though.
          // https://github.com/nodejs/node/blob/f3adc11e37b8bfaaa026ea85c1cf22e3a0e29ae9/lib/internal/modules/esm/translators.js#L382-L409
          output.append(`
;__vite_ssr_exportAll__(module.exports);
export default module.exports;
`)
          return {
            code: output.toString(),
            map: output.generateMap({ hires: 'boundary' }),
          }
        }
      },
    },
  ]
}

function extractPackageKey(id: string): string {
  // .../.yarn/cache/abc/... => abc
  const yarnMatch = id.match(/\/.yarn\/cache\/([^/]+)/)
  if (yarnMatch) {
    return yarnMatch[1]!
  }
  // .../node_modules/@x/y/... => @x/y
  // .../node_modules/x/... => x
  if (id.includes('/node_modules')) {
    id = id.split('/node_modules/').at(-1)!
    let [x, y] = id.split('/')
    if (x!.startsWith('@')) {
      return `${x}/${y}`
    }
    return x!
  }
  return id
}
