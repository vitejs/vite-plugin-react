import { parseAstAsync, type Plugin } from 'vite'
import { findClosestPkgJsonPath } from 'vitefu'
import path from 'node:path'
import fs from 'node:fs'
import * as esModuleLexer from 'es-module-lexer'
import { transformCjsToEsm } from '../transforms/cjs'
import { createDebug } from '@hiogawa/utils'
import { parseIdQuery } from './shared'
import { fileURLToPath, pathToFileURL } from 'node:url'

const debug = createDebug('vite-rsc:cjs')

export function cjsModuleRunnerPlugin(): Plugin[] {
  const warnedPackages = new Set<string>()

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
              `non-optimized CJS dependency in '${this.environment.name}' environment: ${id}`,
            )
            warnedPackages.add(packageKey)
          }

          const ast = await parseAstAsync(code)
          const result = transformCjsToEsm(code, ast, { id })
          const output = result.output
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
