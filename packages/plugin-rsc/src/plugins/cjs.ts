import type { Plugin } from 'vite'
import { parseIdQuery } from './utils'
import { findClosestPkgJsonPath } from 'vitefu'
import path from 'node:path'
import fs from 'node:fs'
import * as rolldown from 'rolldown'

export function cjsModuleRunnerPlugin(): Plugin[] {
  return [
    {
      name: 'cjs-module-runner-transform',
      async transform(code, id) {
        if (
          id.includes('/node_modules/') &&
          !id.startsWith(this.environment.config.cacheDir) &&
          this.environment.config.dev.moduleRunnerTransform &&
          /\b(require|exports)\b/.test(code)
        ) {
          id = parseIdQuery(id).filename
          let isEsm = id.endsWith('.mjs')
          if (id.endsWith('.js')) {
            const pkgJsonPath = await findClosestPkgJsonPath(path.dirname(id))
            if (pkgJsonPath) {
              const pkgJson = JSON.parse(
                fs.readFileSync(pkgJsonPath, 'utf-8'),
              ) as { type?: string }
              isEsm = pkgJson.type === 'module'
            }
          }
          if (!isEsm) {
            // TODO: warning once per package
            this.warn(
              `Found non-optimized CJS dependency in '${this.environment.name}' environment. ` +
                `It is recommended to add the dependency to 'environments.${this.environment.name}.optimizeDeps.include'.`,
            )
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
        }
      },
    },
  ]
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
