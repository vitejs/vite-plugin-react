import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import type * as babelCore from '@babel/core'
import type { ParserOptions, TransformOptions } from '@babel/core'
import { createFilter } from 'vite'
import * as vite from 'vite'
import type { Plugin, PluginOption, ResolvedConfig } from 'vite'
import {
  addRefreshWrapper,
  getPreambleCode,
  preambleCode,
  runtimePublicPath,
  silenceUseClientWarning,
} from '@vitejs/react-common'
import {
  exactRegex,
  makeIdFiltersToMatchWithQuery,
} from '@rolldown/pluginutils'

const _dirname = dirname(fileURLToPath(import.meta.url))

const refreshRuntimePath = globalThis.__IS_BUILD__
  ? join(_dirname, 'refresh-runtime.js')
  : // eslint-disable-next-line n/no-unsupported-features/node-builtins -- only used in dev
    fileURLToPath(import.meta.resolve('@vitejs/react-common/refresh-runtime'))

// lazy load babel since it's not used during build if plugins are not used
let babel: typeof babelCore | undefined
async function loadBabel() {
  if (!babel) {
    babel = await import('@babel/core')
  }
  return babel
}

export interface Options {
  include?: string | RegExp | Array<string | RegExp>
  exclude?: string | RegExp | Array<string | RegExp>
  /**
   * Control where the JSX factory is imported from.
   * https://esbuild.github.io/api/#jsx-import-source
   * @default 'react'
   */
  jsxImportSource?: string
  /**
   * Note: Skipping React import with classic runtime is not supported from v4
   * @default "automatic"
   */
  jsxRuntime?: 'classic' | 'automatic'
  /**
   * Babel configuration applied in both dev and prod.
   */
  babel?:
    | BabelOptions
    | ((id: string, options: { ssr?: boolean }) => BabelOptions)
  /**
   * React Fast Refresh runtime URL prefix.
   * Useful in a module federation context to enable HMR by specifying
   * the host application URL in the Vite config of a remote application.
   * @example
   * reactRefreshHost: 'http://localhost:3000'
   */
  reactRefreshHost?: string

  /**
   * If set, disables the recommendation to use `@vitejs/plugin-react-oxc`
   */
  disableOxcRecommendation?: boolean
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

export type ViteReactPluginApi = {
  /**
   * Manipulate the Babel options of `@vitejs/plugin-react`
   */
  reactBabel?: ReactBabelHook
}

const defaultIncludeRE = /\.[tj]sx?$/
const tsRE = /\.tsx?$/

export default function viteReact(opts: Options = {}): PluginOption[] {
  const include = opts.include ?? defaultIncludeRE
  const exclude = opts.exclude
  const filter = createFilter(include, exclude)

  const jsxImportSource = opts.jsxImportSource ?? 'react'
  const jsxImportRuntime = `${jsxImportSource}/jsx-runtime`
  const jsxImportDevRuntime = `${jsxImportSource}/jsx-dev-runtime`
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
  const importReactRE = /\bimport\s+(?:\*\s+as\s+)?React\b/

  const viteBabel: Plugin = {
    name: 'vite:react-babel',
    enforce: 'pre',
    config() {
      if (opts.jsxRuntime === 'classic') {
        if ('rolldownVersion' in vite) {
          return {
            oxc: {
              jsx: {
                runtime: 'classic',
                // disable __self and __source injection even in dev
                // as this plugin injects them by babel and oxc will throw
                // if development is enabled and those properties are already present
                development: false,
              },
            },
          }
        } else {
          return {
            esbuild: {
              jsx: 'transform',
            },
          }
        }
      } else {
        return {
          esbuild: {
            jsx: 'automatic',
            jsxImportSource: opts.jsxImportSource,
          },
          optimizeDeps:
            'rolldownVersion' in vite
              ? { rollupOptions: { jsx: { mode: 'automatic' } } }
              : { esbuildOptions: { jsx: 'automatic' } },
        }
      }
    },
    configResolved(config) {
      projectRoot = config.root
      isProduction = config.isProduction
      skipFastRefresh =
        isProduction ||
        config.command === 'build' ||
        config.server.hmr === false

      if ('jsxPure' in opts) {
        config.logger.warnOnce(
          '[@vitejs/plugin-react] jsxPure was removed. You can configure esbuild.jsxSideEffects directly.',
        )
      }

      const hooks: ReactBabelHook[] = config.plugins
        .map((plugin) => plugin.api?.reactBabel)
        .filter(defined)

      if (
        'rolldownVersion' in vite &&
        !opts.babel &&
        !hooks.length &&
        !opts.disableOxcRecommendation
      ) {
        config.logger.warn(
          '[vite:react-babel] We recommend switching to `@vitejs/plugin-react-oxc` for improved performance. More information at https://vite.dev/rolldown',
        )
      }

      if (hooks.length > 0) {
        runPluginOverrides = (babelOptions, context) => {
          hooks.forEach((hook) => hook(babelOptions, context, config))
        }
      } else if (typeof opts.babel !== 'function') {
        // Because hooks and the callback option can mutate the Babel options
        // we only create static option in this case and re-create them
        // each time otherwise
        staticBabelOptions = createBabelOptions(opts.babel)

        if (
          canSkipBabel(staticBabelOptions.plugins, staticBabelOptions) &&
          skipFastRefresh &&
          (opts.jsxRuntime === 'classic' ? isProduction : true)
        ) {
          delete viteBabel.transform
        }
      }
    },
    transform: {
      filter: {
        id: {
          include: makeIdFiltersToMatchWithQuery(include),
          exclude: [
            ...(exclude
              ? makeIdFiltersToMatchWithQuery(ensureArray(exclude))
              : []),
            /\/node_modules\//,
          ],
        },
      },
      async handler(code, id, options) {
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
              ? importReactRE.test(code)
              : code.includes(jsxImportDevRuntime) ||
                code.includes(jsxImportRuntime)))
        if (useFastRefresh) {
          plugins.push([
            await loadPlugin('react-refresh/babel'),
            { skipEnvCheck: true },
          ])
        }

        if (opts.jsxRuntime === 'classic' && isJSX) {
          if (!isProduction) {
            // These development plugins are only needed for the classic runtime.
            plugins.push(
              await loadPlugin('@babel/plugin-transform-react-jsx-self'),
              await loadPlugin('@babel/plugin-transform-react-jsx-source'),
            )
          }
        }

        // Avoid parsing if no special transformation is needed
        if (canSkipBabel(plugins, babelOptions)) {
          return
        }

        const parserPlugins = [...babelOptions.parserOpts.plugins]

        if (!filepath.endsWith('.ts')) {
          parserPlugins.push('jsx')
        }

        if (tsRE.test(filepath)) {
          parserPlugins.push('typescript')
        }

        const babel = await loadBabel()
        const result = await babel.transformAsync(code, {
          ...babelOptions,
          root: projectRoot,
          filename: id,
          sourceFileName: filepath,
          // Required for esbuild.jsxDev to provide correct line numbers
          // This creates issues the react compiler because the re-order is too important
          // People should use @babel/plugin-transform-react-jsx-development to get back good line numbers
          retainLines:
            getReactCompilerPlugin(plugins) != null
              ? false
              : !isProduction && isJSX && opts.jsxRuntime !== 'classic',
          parserOpts: {
            ...babelOptions.parserOpts,
            sourceType: 'module',
            allowAwaitOutsideFunction: true,
            plugins: parserPlugins,
          },
          generatorOpts: {
            ...babelOptions.generatorOpts,
            // import attributes parsing available without plugin since 7.26
            importAttributesKeyword: 'with',
            decoratorsBeforeExport: true,
          },
          plugins,
          sourceMaps: true,
        })

        if (result) {
          if (!useFastRefresh) {
            return { code: result.code!, map: result.map }
          }
          return addRefreshWrapper(
            result.code!,
            result.map!,
            '@vitejs/plugin-react',
            id,
            opts.reactRefreshHost,
          )
        }
      },
    },
  }

  const dependencies = [
    'react',
    'react-dom',
    jsxImportDevRuntime,
    jsxImportRuntime,
  ]
  const staticBabelPlugins =
    typeof opts.babel === 'object' ? opts.babel?.plugins ?? [] : []
  const reactCompilerPlugin = getReactCompilerPlugin(staticBabelPlugins)
  if (reactCompilerPlugin != null) {
    const reactCompilerRuntimeModule =
      getReactCompilerRuntimeModule(reactCompilerPlugin)
    dependencies.push(reactCompilerRuntimeModule)
  }

  const viteReactRefresh: Plugin = {
    name: 'vite:react-refresh',
    enforce: 'pre',
    config: (userConfig) => ({
      build: silenceUseClientWarning(userConfig),
      optimizeDeps: {
        include: dependencies,
      },
      resolve: {
        dedupe: ['react', 'react-dom'],
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

  return [viteBabel, viteReactRefresh]
}

viteReact.preambleCode = preambleCode

function canSkipBabel(
  plugins: ReactBabelOptions['plugins'],
  babelOptions: ReactBabelOptions,
) {
  return !(
    plugins.length ||
    babelOptions.presets.length ||
    babelOptions.configFile ||
    babelOptions.babelrc
  )
}

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

function getReactCompilerPlugin(plugins: ReactBabelOptions['plugins']) {
  return plugins.find(
    (p) =>
      p === 'babel-plugin-react-compiler' ||
      (Array.isArray(p) && p[0] === 'babel-plugin-react-compiler'),
  )
}

type ReactCompilerRuntimeModule =
  | 'react/compiler-runtime' // from react namespace
  | 'react-compiler-runtime' // npm package
function getReactCompilerRuntimeModule(
  plugin: babelCore.PluginItem,
): ReactCompilerRuntimeModule {
  let moduleName: ReactCompilerRuntimeModule = 'react/compiler-runtime'
  if (Array.isArray(plugin)) {
    if (plugin[1]?.target === '17' || plugin[1]?.target === '18') {
      moduleName = 'react-compiler-runtime'
    } else if (typeof plugin[1]?.runtimeModule === 'string') {
      // backward compatibility from (#374), can be removed in next major
      moduleName = plugin[1]?.runtimeModule
    }
  }
  return moduleName
}

function ensureArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}
