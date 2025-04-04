import type { BuildOptions, Plugin, PluginOption, UserConfig } from 'vite'
import {
  addClassComponentRefreshWrapper,
  addRefreshWrapper,
  preambleCode,
  runtimeCode,
  runtimePublicPath,
} from './fast-refresh'

export interface Options {
  include?: string | RegExp | Array<string | RegExp>
  exclude?: string | RegExp | Array<string | RegExp>
  /**
   * Control where the JSX factory is imported from.
   * @default 'react'
   */
  jsxImportSource?: string
}

const reactCompRE = /extends\s+(?:React\.)?(?:Pure)?Component/
const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/
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
        build: silenceUseClientWarning(userConfig),
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
        return runtimeCode
      },
    },
  }

  let devBase: string
  let skipFastRefresh = false

  const viteRefreshWrapper: Plugin = {
    name: 'vite:react-oxc:refresh-wrapper',
    apply: 'serve',
    configResolved(config) {
      devBase = config.base
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

        if (useFastRefresh) {
          if (refreshContentRE.test(code)) {
            code = addRefreshWrapper(code, id)
          } else if (reactCompRE.test(code)) {
            code = addClassComponentRefreshWrapper(code, id)
          }
          return { code }
        }
      },
    },
    transformIndexHtml() {
      if (!skipFastRefresh)
        return [
          {
            tag: 'script',
            attrs: { type: 'module' },
            children: preambleCode.replace(`__BASE__`, devBase),
          },
        ]
    },
  }

  return [viteConfig, viteRefreshRuntime, viteRefreshWrapper]
}

const silenceUseClientWarning = (userConfig: UserConfig): BuildOptions => ({
  rollupOptions: {
    onwarn(warning, defaultHandler) {
      if (
        warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
        warning.message.includes('use client')
      ) {
        return
      }
      // https://github.com/vitejs/vite/issues/15012
      if (
        warning.code === 'SOURCEMAP_ERROR' &&
        warning.message.includes('resolve original location') &&
        warning.pos === 0
      ) {
        return
      }
      if (userConfig.build?.rollupOptions?.onwarn) {
        userConfig.build.rollupOptions.onwarn(warning, defaultHandler)
      } else {
        defaultHandler(warning)
      }
    },
  },
})

function exactRegex(input: string): RegExp {
  return new RegExp(`^${escapeRegex(input)}$`)
}

const escapeRegexRE = /[-/\\^$*+?.()|[\]{}]/g
function escapeRegex(str: string): string {
  return str.replace(escapeRegexRE, '\\$&')
}
