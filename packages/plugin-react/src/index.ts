import type { ParserOptions, TransformOptions } from '@babel/core'
import * as babel from '@babel/core'
import { createFilter } from 'vite'
import type {
  BuildOptions,
  Plugin,
  PluginOption,
  ResolvedConfig,
  UserConfig,
} from 'vite'
import MagicString from 'magic-string'
import type { SourceMap } from 'magic-string'
import {
  addRefreshWrapper,
  preambleCode,
  runtimeCode,
  runtimePublicPath,
} from './fast-refresh'

export interface Options {
  include?: string | RegExp | Array<string | RegExp>
  exclude?: string | RegExp | Array<string | RegExp>
  /**
   * @deprecated All tools now support the automatic runtime, and it has been backported
   * up to React 16. This allows to skip the React import and can produce smaller bundlers.
   * @default "automatic"
   */
  jsxRuntime?: 'classic' | 'automatic'
  /**
   * Control where the JSX factory is imported from.
   * https://esbuild.github.io/api/#jsx-import-source
   * @default 'react'
   */
  jsxImportSource?: string
  /**
   * Babel configuration applied in both dev and prod.
   */
  babel?:
    | BabelOptions
    | ((id: string, options: { ssr?: boolean }) => BabelOptions)
}

export type BabelOptions = Omit<
  TransformOptions,
  | 'ast'
  | 'filename'
  | 'root'
  | 'sourceFileName'
  | 'sourceMaps'
  | 'inputSourceMap'
>

/**
 * The object type used by the `options` passed to plugins with
 * an `api.reactBabel` method.
 */
export interface ReactBabelOptions extends BabelOptions {
  plugins: Extract<BabelOptions['plugins'], any[]>
  presets: Extract<BabelOptions['presets'], any[]>
  overrides: Extract<BabelOptions['overrides'], any[]>
  parserOpts: ParserOptions & {
    plugins: Extract<ParserOptions['plugins'], any[]>
  }
}

type ReactBabelHook = (
  babelConfig: ReactBabelOptions,
  context: ReactBabelHookContext,
  config: ResolvedConfig,
) => void

type ReactBabelHookContext = { ssr: boolean; id: string }

declare module 'vite' {
  export interface Plugin {
    api?: {
      /**
       * Manipulate the Babel options of `@vitejs/plugin-react`
       */
      reactBabel?: ReactBabelHook
    }
  }
}

const prependReactImportCode = "import React from 'react'; "
const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/
const defaultIncludeRE = /\.[tj]sx?$/
const tsRE = /\.tsx?$/

export default function viteReact(opts: Options = {}): PluginOption[] {
  // Provide default values for Rollup compat.
  let devBase = '/'
  const filter = createFilter(opts.include ?? defaultIncludeRE, opts.exclude)
  const devRuntime = `${opts.jsxImportSource ?? 'react'}/jsx-dev-runtime`
  let needHiresSourcemap = false
  let isProduction = true
  let projectRoot = process.cwd()
  let skipFastRefresh = false
  let runPluginOverrides:
    | ((options: ReactBabelOptions, context: ReactBabelHookContext) => void)
    | undefined
  let staticBabelOptions: ReactBabelOptions | undefined

  // Support patterns like:
  // - import * as React from 'react';
  // - import React from 'react';
  // - import React, {useEffect} from 'react';
  const importReactRE = /(?:^|\n)import\s+(?:\*\s+as\s+)?React(?:,|\s+)/

  const viteBabel: Plugin = {
    name: 'vite:react-babel',
    enforce: 'pre',
    config() {
      if (opts.jsxRuntime === 'classic') {
        return {
          esbuild: {
            jsx: 'transform',
          },
        }
      } else {
        return {
          esbuild: {
            jsx: 'automatic',
            jsxImportSource: opts.jsxImportSource,
          },
        }
      }
    },
    configResolved(config) {
      devBase = config.base
      projectRoot = config.root
      needHiresSourcemap =
        config.command === 'build' && !!config.build.sourcemap
      isProduction = config.isProduction
      skipFastRefresh = isProduction || config.command === 'build'

      if (opts.jsxRuntime === 'classic') {
        config.logger.warnOnce(
          '[@vitejs/plugin-react] Support for classic runtime is deprecated.',
        )
      }
      if ('jsxPure' in opts) {
        config.logger.warnOnce(
          '[@vitejs/plugin-react] jsxPure was removed. You can configure esbuild.jsxSideEffects directly.',
        )
      }

      const hooks = config.plugins
        .map((plugin) => plugin.api?.reactBabel)
        .filter(defined)

      if (hooks.length > 0) {
        runPluginOverrides = (babelOptions, context) => {
          hooks.forEach((hook) => hook(babelOptions, context, config))
        }
      } else if (typeof opts.babel !== 'function') {
        staticBabelOptions = createBabelOptions(opts.babel)
      }
    },
    async transform(code, id, options) {
      if (id.includes('/node_modules/')) return

      const [filepath] = id.split('?')
      if (!filter(filepath)) return

      const ssr = options?.ssr === true
      const babelOptions = (() => {
        if (staticBabelOptions) return staticBabelOptions
        const newBabelOptions = createBabelOptions(
          typeof opts.babel === 'function'
            ? opts.babel(id, { ssr })
            : opts.babel,
        )
        runPluginOverrides?.(newBabelOptions, { id, ssr })
        return newBabelOptions
      })()
      const plugins = [...babelOptions.plugins]

      const isJSX = filepath.endsWith('x')
      const useFastRefresh =
        !skipFastRefresh &&
        !ssr &&
        (isJSX ||
          (opts.jsxRuntime === 'classic'
            ? code.includes(devRuntime)
            : importReactRE.test(code)))
      if (useFastRefresh) {
        plugins.push([
          await loadPlugin('react-refresh/babel'),
          { skipEnvCheck: true },
        ])
      }

      let prependReactImport = false
      if (opts.jsxRuntime === 'classic' && isJSX) {
        if (!isProduction) {
          // These development plugins are only needed for the classic runtime.
          plugins.push(
            await loadPlugin('@babel/plugin-transform-react-jsx-self'),
            await loadPlugin('@babel/plugin-transform-react-jsx-source'),
          )
        }

        // Even if the automatic JSX runtime is not used, we can still
        // inject the React import for .jsx and .tsx modules.
        if (!importReactRE.test(code)) {
          prependReactImport = true
        }
      }

      let inputMap: SourceMap | undefined
      if (prependReactImport) {
        if (needHiresSourcemap) {
          const s = new MagicString(code)
          s.prepend(prependReactImportCode)
          code = s.toString()
          inputMap = s.generateMap({ hires: true, source: id })
        } else {
          code = prependReactImportCode + code
        }
      }

      // Avoid parsing if no special transformation is needed
      if (
        !plugins.length &&
        !babelOptions.configFile &&
        !babelOptions.babelrc
      ) {
        return { code, map: inputMap ?? null }
      }

      const parserPlugins = [...babelOptions.parserOpts.plugins]

      if (!filepath.endsWith('.ts')) {
        parserPlugins.push('jsx')
      }

      if (tsRE.test(filepath)) {
        parserPlugins.push('typescript')
      }

      const result = await babel.transformAsync(code, {
        ...babelOptions,
        root: projectRoot,
        filename: id,
        sourceFileName: filepath,
        parserOpts: {
          ...babelOptions.parserOpts,
          sourceType: 'module',
          allowAwaitOutsideFunction: true,
          plugins: parserPlugins,
        },
        generatorOpts: {
          ...babelOptions.generatorOpts,
          decoratorsBeforeExport: true,
        },
        plugins,
        sourceMaps: true,
        // Vite handles sourcemap flattening
        inputSourceMap: inputMap ?? (false as any),
      })

      if (result) {
        let code = result.code!
        if (useFastRefresh && refreshContentRE.test(code)) {
          code = addRefreshWrapper(code, id)
        }
        return { code, map: result.map }
      }
    },
  }

  const viteReactRefresh: Plugin = {
    name: 'vite:react-refresh',
    enforce: 'pre',
    config: (userConfig) => ({
      build: silenceUseClientWarning(userConfig),
      optimizeDeps: {
        // We can't add `react-dom` because the dependency is `react-dom/client`
        // for React 18 while it's `react-dom` for React 17. We'd need to detect
        // what React version the user has installed.
        include: ['react', devRuntime],
      },
      resolve: {
        dedupe: ['react', 'react-dom'],
      },
    }),
    resolveId(id) {
      if (id === runtimePublicPath) {
        return id
      }
    },
    load(id) {
      if (id === runtimePublicPath) {
        return runtimeCode
      }
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

  return [viteBabel, viteReactRefresh]
}

viteReact.preambleCode = preambleCode

const silenceUseClientWarning = (userConfig: UserConfig): BuildOptions => ({
  rollupOptions: {
    onwarn(warning, defaultHandler) {
      if (
        warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
        warning.message.includes('use client')
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

const loadedPlugin = new Map<string, any>()
function loadPlugin(path: string): any {
  const cached = loadedPlugin.get(path)
  if (cached) return cached

  const promise = import(path).then((module) => {
    const value = module.default || module
    loadedPlugin.set(path, value)
    return value
  })
  loadedPlugin.set(path, promise)
  return promise
}

function createBabelOptions(rawOptions?: BabelOptions) {
  const babelOptions = {
    babelrc: false,
    configFile: false,
    ...rawOptions,
  } as ReactBabelOptions

  babelOptions.plugins ||= []
  babelOptions.presets ||= []
  babelOptions.overrides ||= []
  babelOptions.parserOpts ||= {} as any
  babelOptions.parserOpts.plugins ||= []

  return babelOptions
}

function defined<T>(value: T | undefined): value is T {
  return value !== undefined
}
