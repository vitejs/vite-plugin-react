import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  exactRegex,
  makeIdFiltersToMatchWithQuery,
} from '@rolldown/pluginutils'
import {
  getPreambleCode,
  preambleCode,
  runtimePublicPath,
  silenceUseClientWarning,
  virtualPreamblePlugin,
} from '@vitejs/react-common'
import type { Plugin } from 'vite'
import { reactRefreshWrapperPlugin } from 'vite/internal'
import { reactCompilerPreset } from './reactCompilerPreset'

const _dirname = dirname(fileURLToPath(import.meta.url))
const refreshRuntimePath = join(_dirname, 'refresh-runtime.js')

export interface Options {
  /**
   * Can be used to process extra files like `.mdx`
   * @example include: /\.(mdx|js|jsx|ts|tsx)$/
   * @default /\.[tj]sx?$/
   */
  include?: string | RegExp | Array<string | RegExp>
  /**
   * Can be used to exclude JSX/TSX files that runs in a worker or are not React files.
   * Except if explicitly desired, you should keep node_modules in the exclude list
   * @example exclude: [/\/pdf\//, /\.solid\.tsx$/, /\/node_modules\//]
   * @default /\/node_modules\//
   */
  exclude?: string | RegExp | Array<string | RegExp>
  /**
   * Control where the JSX factory is imported from.
   * https://oxc.rs/docs/guide/usage/transformer/jsx.html#import-source
   * @default 'react'
   */
  jsxImportSource?: string
  /**
   * Note: Skipping React import with classic runtime is not supported from v4
   * @default "automatic"
   */
  jsxRuntime?: 'classic' | 'automatic'
  /**
   * React Fast Refresh runtime URL prefix.
   * Useful in a module federation context to enable HMR by specifying
   * the host application URL in the Vite config of a remote application.
   * @example
   * reactRefreshHost: 'http://localhost:3000'
   */
  reactRefreshHost?: string
}

const defaultIncludeRE = /\.[tj]sx?$/
const defaultExcludeRE = /\/node_modules\//

export default function viteReact(opts: Options = {}): Plugin[] {
  const include = opts.include ?? defaultIncludeRE
  const exclude = opts.exclude ?? defaultExcludeRE

  const jsxImportSource = opts.jsxImportSource ?? 'react'
  const jsxImportRuntime = `${jsxImportSource}/jsx-runtime`
  const jsxImportDevRuntime = `${jsxImportSource}/jsx-dev-runtime`

  let runningInVite = false
  let isProduction = true
  let skipFastRefresh = true
  let base: string
  let isBundledDev = false

  const viteBabel: Plugin = {
    name: 'vite:react-babel',
    enforce: 'pre',
    config(_userConfig, { command }) {
      if (opts.jsxRuntime === 'classic') {
        return {
          oxc: {
            jsx: {
              runtime: 'classic',
              refresh: command === 'serve',
            },
            jsxRefreshInclude: makeIdFiltersToMatchWithQuery(include),
            jsxRefreshExclude: makeIdFiltersToMatchWithQuery(exclude),
          },
        }
      } else {
        return {
          oxc: {
            jsx: {
              runtime: 'automatic',
              importSource: opts.jsxImportSource,
              refresh: command === 'serve',
            },
            jsxRefreshInclude: makeIdFiltersToMatchWithQuery(include),
            jsxRefreshExclude: makeIdFiltersToMatchWithQuery(exclude),
          },
          optimizeDeps: {
            rolldownOptions: { transform: { jsx: { runtime: 'automatic' } } },
          },
        }
      }
    },
    configResolved(config) {
      runningInVite = true
      base = config.base
      if (config.experimental.bundledDev) {
        isBundledDev = true
      }
      isProduction = config.isProduction
      skipFastRefresh =
        isProduction ||
        config.command === 'build' ||
        config.server.hmr === false
    },
    options(options) {
      if (!runningInVite) {
        options.transform ??= {}
        options.transform.jsx = {
          runtime: opts.jsxRuntime,
          importSource: opts.jsxImportSource,
        }
        return options
      }
    },
  }

  const viteRefreshWrapper: Plugin = {
    name: 'vite:react:refresh-wrapper',
    apply: 'serve',
    async applyToEnvironment(env) {
      if (env.config.consumer !== 'client' || skipFastRefresh) {
        return false
      }

      return reactRefreshWrapperPlugin({
        cwd: process.cwd(),
        include: makeIdFiltersToMatchWithQuery(include),
        exclude: makeIdFiltersToMatchWithQuery(exclude),
        jsxImportSource,
        reactRefreshHost: opts.reactRefreshHost ?? '',
      }) as unknown as boolean
    },
  }

  const viteConfigPost: Plugin = {
    name: 'vite:react:config-post',
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

  // for full bundle mode
  const viteReactRefreshBundledDevMode: Plugin = {
    name: 'vite:react-refresh-fbm',
    enforce: 'pre',
    transformIndexHtml: {
      handler() {
        if (!skipFastRefresh && isBundledDev)
          return [
            {
              tag: 'script',
              attrs: { type: 'module' },
              children: getPreambleCode(base),
            },
          ]
      },
      // In unbundled mode, Vite transforms any requests.
      // But in full bundled mode, Vite only transforms / bundles the scripts injected in `order: 'pre'`.
      order: 'pre',
    },
  }

  const dependencies = [
    'react',
    'react-dom',
    jsxImportDevRuntime,
    jsxImportRuntime,
  ]

  const viteReactRefresh: Plugin = {
    name: 'vite:react-refresh',
    enforce: 'pre',
    config: (userConfig) => ({
      build: silenceUseClientWarning(userConfig),
      optimizeDeps: {
        include: dependencies,
      },
    }),
    resolveId: {
      filter: { id: exactRegex(runtimePublicPath) },
      handler(id) {
        if (id === runtimePublicPath) {
          return id
        }
      },
    },
    load: {
      filter: { id: exactRegex(runtimePublicPath) },
      handler(id) {
        if (id === runtimePublicPath) {
          return readFileSync(refreshRuntimePath, 'utf-8').replace(
            /__README_URL__/g,
            'https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react',
          )
        }
      },
    },
    transformIndexHtml() {
      if (!skipFastRefresh && !isBundledDev)
        return [
          {
            tag: 'script',
            attrs: { type: 'module' },
            children: getPreambleCode(base),
          },
        ]
    },
  }

  return [
    viteBabel,
    viteRefreshWrapper,
    viteConfigPost,
    viteReactRefreshBundledDevMode,
    viteReactRefresh,
    virtualPreamblePlugin({
      name: '@vitejs/plugin-react/preamble',
      isEnabled: () => !skipFastRefresh && !isBundledDev,
    }),
  ]
}

viteReact.preambleCode = preambleCode

export { reactCompilerPreset }

// Compat for require
function viteReactForCjs(this: unknown, options: Options): Plugin[] {
  return viteReact.call(this, options)
}
Object.assign(viteReactForCjs, {
  default: viteReactForCjs,
  reactCompilerPreset,
})
export { viteReactForCjs as 'module.exports' }
