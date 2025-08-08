import type { Plugin } from 'vite'
import { parseIdQuery } from './utils'
import { findClosestPkgJsonPath } from 'vitefu'
import path from 'node:path'
import fs from 'node:fs'
import * as rolldown from 'rolldown'
import * as esModuleLexer from 'es-module-lexer'

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
          if (id.endsWith('.mjs')) return

          const pkgJsonPath = await findClosestPkgJsonPath(path.dirname(id))
          if (pkgJsonPath) {
            const pkgJson = JSON.parse(
              fs.readFileSync(pkgJsonPath, 'utf-8'),
            ) as { type?: string }
            if (pkgJson.type === 'module') return
          }

          // it can be esm build from "module" exports, which should be skipped
          const [, , , hasModuleSyntax] = esModuleLexer.parse(code)
          if (hasModuleSyntax) return

          // warning once per package
          const packageKey = extractPackageKey(id)
          if (!warnedPackages.has(packageKey)) {
            warnedPackages.add(packageKey)
            this.warn(
              `Found non-optimized CJS dependency in '${this.environment.name}' environment. ` +
                `It is recommended to add the dependency to 'environments.${this.environment.name}.optimizeDeps.include'.`,
            )
          }

          return cjsModuleRunnerTransform(code, {
            define: {
              'process.env.NODE_ENV': JSON.stringify(
                this.environment.config.isProduction
                  ? 'production'
                  : 'development',
              ),
            },
          })
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

export async function cjsModuleRunnerTransform(
  code: string,
  config?: rolldown.BuildOptions,
): Promise<string> {
  const output = await rolldown.build({
    ...config,
    write: false,
    output: {
      format: 'esm',
    },
    input: 'virtual:entry',
    plugins: [
      {
        name: 'entry',
        resolveId(source, _importer, options) {
          if (source === 'virtual:entry') {
            return '\0' + source
          }
          if (source === 'virtual:entry-inner') {
            return '\0' + source
          }
          if (options.kind === 'require-call') {
            return '\0virtual:require-to-import/' + source
          }
          return {
            id: source,
            external: true,
          }
        },
        load(id) {
          if (id === '\0virtual:entry') {
            return `
import * as m from "virtual:entry-inner";
__vite_ssr_exportAll__(m);
`
          }
          if (id === '\0virtual:entry-inner') {
            return code
          }
          if (id.startsWith('\0virtual:require-to-import/')) {
            id = id.slice('\0virtual:require-to-import/'.length)
            return `
import * as m from ${JSON.stringify(id)};
module.exports = m;
`
          }
        },
      },
    ],
  })
  return output.output[0].code
}
