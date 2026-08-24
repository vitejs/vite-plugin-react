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
import type { Plugin, ServerOptions } from 'vite'
import { reactRefreshWrapperPlugin } from 'vite/internal'
import type { ReactCompilerOptions } from '#optionalTypes'
import { defaultCodeFilter, reactCompilerPreset } from './reactCompilerPreset'

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
  /**
   * Enable React Compiler with its default options or configure it.
   * This requires `oxc-transform-react` to be installed.
   * @default false
   * @experimental
   */
  compiler?: boolean | ReactCompilerOptions
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
  let skipFastRefresh = true
  let base: string
  let isBundledDev = false

  function calculateSkipFastRefresh(
    isProduction: boolean,
    command: 'serve' | 'build',
    hmr: ServerOptions['hmr'],
  ) {
    return isProduction || command === 'build' || hmr === false
  }

  const viteBabel: Plugin = {
    name: 'vite:react-babel',
    enforce: 'pre',
    config(_userConfig, { command }) {
      const refresh = command === 'serve' && !opts.compiler
      if (opts.jsxRuntime === 'classic') {
        return {
          oxc: {
            jsx: {
              runtime: 'classic',
              refresh,
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
              refresh,
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
      if (
        skipFastRefresh !==
        calculateSkipFastRefresh(
          config.isProduction,
          config.command,
          config.server?.hmr,
        )
      ) {
        this.warn(
          `NODE_ENV (${JSON.stringify(process.env.NODE_ENV)}) or server.hmr was changed by plugins after the react plugin read the config. This may cause unexpected behavior.`,
        )
      }
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
    config(userConfig, { command }) {
      skipFastRefresh = calculateSkipFastRefresh(
        // same with ResolvedConfig.isProduction
        process.env.NODE_ENV === 'production',
        command,
        userConfig.server?.hmr,
      )
      if (skipFastRefresh) {
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
              // In bundled dev mode, the src does not go through the middlewares
              // so we don't need to append the base
              children: getPreambleCode('/'),
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

  const plugins = [
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

  if (opts.compiler) {
    plugins.unshift(
      createReactCompilerPlugin(
        opts.compiler === true ? {} : opts.compiler,
        include,
        exclude,
        {
          standalone: false,
          reactOptions: opts,
          isFastRefreshEnabled: () => !skipFastRefresh,
        },
      ),
    )
  }

  return plugins
}

export interface ReactCompilerPluginOptions extends ReactCompilerOptions {
  /**
   * Same as the `include` option of the main plugin
   * @default /\.[tj]sx?$/
   */
  include?: Options['include']
  /**
   * Same as the `exclude` option of the main plugin
   * @default /\/node_modules\//
   */
  exclude?: Options['exclude']
}

/**
 * Standalone React Compiler plugin for setups where another plugin already
 * handles JSX and Fast Refresh (e.g. React Router framework mode), so the
 * main plugin cannot be added. It only runs the React Compiler, in client
 * environments, and preserves JSX for the rest of the pipeline.
 * This requires `oxc-transform-react` to be installed.
 * @experimental
 */
export function reactCompiler(
  options: ReactCompilerPluginOptions = {},
): Plugin {
  const {
    include = defaultIncludeRE,
    exclude = defaultExcludeRE,
    ...compilerOptions
  } = options
  return createReactCompilerPlugin(compilerOptions, include, exclude, {
    standalone: true,
  })
}

type ReactCompilerPluginHost =
  | { standalone: true }
  | {
      standalone: false
      reactOptions: Pick<Options, 'jsxRuntime' | 'jsxImportSource'>
      isFastRefreshEnabled: () => boolean
    }

function createReactCompilerPlugin(
  options: ReactCompilerOptions,
  include: NonNullable<Options['include']>,
  exclude: NonNullable<Options['exclude']>,
  host: ReactCompilerPluginHost,
): Plugin {
  let sourcemap = true
  let jsxDevelopment = false
  let compiler: typeof import('oxc-transform-react') | undefined
  const runtime =
    options.target === '17' || options.target === '18'
      ? 'react-compiler-runtime'
      : 'react/compiler-runtime'
  const codeFilter =
    options.compilationMode === 'annotation'
      ? /['"]use memo['"]/
      : defaultCodeFilter

  const loadCompiler = async (
    onError: (message: string) => never,
  ): Promise<typeof import('oxc-transform-react')> => {
    if (compiler) return compiler

    try {
      return (compiler = await import('oxc-transform-react'))
    } catch (error) {
      return onError(
        `React Compiler requires the optional \`oxc-transform-react\` package. Install it in your project before enabling \`${
          host.standalone ? 'reactCompiler()' : 'react({ compiler: true })'
        }\`.${error instanceof Error ? `\n${error.message}` : ''}`,
      )
    }
  }

  return {
    name: 'vite:react-compiler',
    enforce: 'pre',
    ...(host.standalone
      ? {
          // Nothing to do for server environments when JSX is not transformed here.
          applyToEnvironment: (env) => env.config.consumer === 'client',
        }
      : {}),
    async config() {
      await loadCompiler((message) => this.error(message))
      return {
        optimizeDeps: {
          include: [runtime],
        },
      }
    },
    configResolved(config) {
      sourcemap = config.command !== 'build' || !!config.build.sourcemap
      jsxDevelopment = !config.isProduction
    },
    transform: {
      filter: {
        id: {
          include: makeIdFiltersToMatchWithQuery(include),
          exclude: makeIdFiltersToMatchWithQuery(exclude),
        },
        // The main plugin must still transform JSX in files the compiler skips.
        ...(host.standalone ? { code: codeFilter } : {}),
      },
      async handler(code, id) {
        const isClient = this.environment?.config.consumer !== 'server'
        const shouldCompile = isClient && codeFilter.test(code)
        if (host.standalone && !shouldCompile) return
        // The config hook is not called when the plugin is used with Rolldown directly.
        const { transform } =
          compiler ?? (await loadCompiler((message) => this.error(message)))

        const result = await transform(id.split('?')[0]!, code, {
          jsx: host.standalone
            ? 'preserve'
            : {
                runtime: host.reactOptions.jsxRuntime,
                development: jsxDevelopment,
                importSource: host.reactOptions.jsxImportSource,
                refresh: isClient && host.isFastRefreshEnabled(),
              },
          reactCompiler: shouldCompile ? options : false,
          sourcemap,
        })
        const diagnostics = result.errors.map(
          (error) =>
            `${error.message}${error.codeframe ? `\n${error.codeframe}` : ''}`,
        )

        if (result.fatal) {
          this.error(
            diagnostics.join('\n\n') || 'React Compiler transform failed.',
          )
        }
        for (const diagnostic of diagnostics) {
          this.warn(diagnostic)
        }

        return { code: result.code, map: result.map }
      },
    },
  }
}

viteReact.preambleCode = preambleCode

export { reactCompilerPreset }
export type { ReactCompilerOptions }

// Compat for require
function viteReactForCjs(this: unknown, options: Options): Plugin[] {
  return viteReact.call(this, options)
}
Object.assign(viteReactForCjs, {
  default: viteReactForCjs,
  reactCompilerPreset,
  reactCompiler,
})
export { viteReactForCjs as 'module.exports' }
