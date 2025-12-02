import type { BuildOptions, Plugin } from 'vite'

import { exactRegex } from '@rolldown/pluginutils'
import {
  addRefreshWrapper,
  getPreambleCode,
  runtimePublicPath,
  silenceUseClientWarning,
} from '@vitejs/react-common'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const _dirname = dirname(fileURLToPath(import.meta.url))
const refreshRuntimePath = join(_dirname, 'refresh-runtime.js')

export interface Options {
  include?: string | RegExp | Array<string | RegExp>
  exclude?: string | RegExp | Array<string | RegExp>
  /**
   * Control where the JSX factory is imported from.
   * @default 'react'
   */
  jsxImportSource?: string
}

const defaultIncludeRE = /\.[tj]sx?(?:$|\?)/
const defaultExcludeRE = /\/node_modules\//

export default function viteReact(opts: Options = {}): Plugin[] {
  const include = opts.include ?? defaultIncludeRE
  const exclude = opts.exclude ?? defaultExcludeRE

  const jsxImportSource = opts.jsxImportSource ?? 'react'
  const jsxImportRuntime = `${jsxImportSource}/jsx-runtime`
  const jsxImportDevRuntime = `${jsxImportSource}/jsx-dev-runtime`

  const viteConfig: Plugin = {
    name: 'vite:react-oxc:config',
    config(userConfig, { command }) {
      return {
        // @ts-expect-error rolldown-vite Vite type incompatibility
        build: silenceUseClientWarning(userConfig) as BuildOptions,
        oxc: {
          jsx: {
            runtime: 'automatic',
            importSource: jsxImportSource,
            refresh: command === 'serve',
            development: command === 'serve',
          },
          jsxRefreshInclude: include,
          jsxRefreshExclude: exclude,
        },
        optimizeDeps: {
          include: [
            'react',
            'react-dom',
            jsxImportDevRuntime,
            jsxImportRuntime,
          ],
          rolldownOptions: { transform: { jsx: { runtime: 'automatic' } } },
        },
      }
    },
    configResolved(config) {
      config.logger.warn(
        '@vitejs/plugin-react-oxc is deprecated. ' +
          'Please use @vitejs/plugin-react instead. ' +
          'The changes of this plugin is now included in @vitejs/plugin-react.',
      )
    },
    options() {
      if (!this.meta.rolldownVersion) {
        throw new Error(
          '@vitejs/plugin-react-oxc requires rolldown-vite to be used. ' +
            'See https://vitejs.dev/guide/rolldown for more details about rolldown-vite.',
        )
      }
    },
  }

  const viteConfigPost: Plugin = {
    name: 'vite:react-oxc:config-post',
    enforce: 'post',
    config(userConfig) {
      if (userConfig.server?.hmr === false) {
        return {
          oxc: {
            jsx: {
              refresh: false,
            },
          },
        }
      }
    },
  }

  const viteRefreshRuntime: Plugin = {
    name: 'vite:react-oxc:refresh-runtime',
    enforce: 'pre',
    resolveId: {
      filter: { id: exactRegex(runtimePublicPath) },
      handler(id) {
        return id
      },
    },
    load: {
      filter: { id: exactRegex(runtimePublicPath) },
      handler(_id) {
        return readFileSync(refreshRuntimePath, 'utf-8').replace(
          /__README_URL__/g,
          'https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react-oxc',
        )
      },
    },
  }

  let skipFastRefresh = false

  const viteRefreshWrapper: Plugin = {
    name: 'vite:react-oxc:refresh-wrapper',
    apply: 'serve',
    configResolved(config) {
      skipFastRefresh = config.isProduction || config.server.hmr === false
    },
    transform: {
      filter: {
        id: { include, exclude },
      },
      handler(code, id, options) {
        const ssr = options?.ssr === true

        const [filepath] = id.split('?')
        const isJSX = filepath.endsWith('x')
        const useFastRefresh =
          !skipFastRefresh &&
          !ssr &&
          (isJSX ||
            code.includes(jsxImportDevRuntime) ||
            code.includes(jsxImportRuntime))
        if (!useFastRefresh) return

        const newCode = addRefreshWrapper(code, '@vitejs/plugin-react-oxc', id)
        return newCode ? { code: newCode, map: null } : undefined
      },
    },
    transformIndexHtml(_, config) {
      if (!skipFastRefresh)
        return [
          {
            tag: 'script',
            attrs: { type: 'module' },
            children: getPreambleCode(config.server!.config.base),
          },
        ]
    },
  }

  return [viteConfig, viteConfigPost, viteRefreshRuntime, viteRefreshWrapper]
}
