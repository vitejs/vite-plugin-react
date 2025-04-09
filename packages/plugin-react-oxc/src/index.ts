import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import type { BuildOptions, Plugin, PluginOption } from 'vite'
import {
  addRefreshWrapper,
  avoidSourceMapOption,
  getPreambleCode,
  runtimePublicPath,
  silenceUseClientWarning,
} from '@vitejs/react-common'

const _dirname = dirname(fileURLToPath(import.meta.url))

const refreshRuntimePath = globalThis.__IS_BUILD__
  ? join(_dirname, 'refresh-runtime.js')
  : // eslint-disable-next-line n/no-unsupported-features/node-builtins -- only used in dev
    fileURLToPath(import.meta.resolve('@vitejs/react-common/refresh-runtime'))

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

export default function viteReact(opts: Options = {}): PluginOption[] {
  const include = opts.include ?? defaultIncludeRE
  const exclude = [
    ...(Array.isArray(opts.exclude)
      ? opts.exclude
      : opts.exclude
        ? [opts.exclude]
        : []),
    /\/node_modules\//,
  ]

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
          rollupOptions: { jsx: { mode: 'automatic' } },
        },
      }
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

        const { code: newCode } = addRefreshWrapper(
          code,
          avoidSourceMapOption,
          '@vitejs/plugin-react-oxc',
          id,
        )
        return { code: newCode, map: null }
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

  return [viteConfig, viteRefreshRuntime, viteRefreshWrapper]
}

function exactRegex(input: string): RegExp {
  return new RegExp(`^${escapeRegex(input)}$`)
}

const escapeRegexRE = /[-/\\^$*+?.()|[\]{}]/g
function escapeRegex(str: string): string {
  return str.replace(escapeRegexRE, '\\$&')
}
