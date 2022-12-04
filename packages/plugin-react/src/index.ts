import path from 'node:path'
import type { ParserOptions, TransformOptions } from '@babel/core'
import * as babel from '@babel/core'
import { createFilter, loadEnv, normalizePath, resolveEnvPrefix } from 'vite'
import type { Plugin, PluginOption, ResolvedConfig } from 'vite'
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
   * Enable `react-refresh` integration. Vite disables this in prod env or build mode.
   * @default true
   */
  fastRefresh?: boolean
  /**
   * Set this to `"automatic"` to use [vite-react-jsx](https://github.com/alloc/vite-react-jsx).
   * @default "automatic"
   */
  jsxRuntime?: 'classic' | 'automatic'
  /**
   * Control where the JSX factory is imported from.
   * This option is ignored when `jsxRuntime` is not `"automatic"`.
   * @default "react"
   */
  jsxImportSource?: string
  /**
   * Set this to `true` to annotate the JSX factory with `\/* @__PURE__ *\/`.
   * This option is ignored when `jsxRuntime` is not `"automatic"`.
   * @default true
   */
  jsxPure?: boolean
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

export default function viteReact(opts: Options = {}): PluginOption[] {
  // Provide default values for Rollup compat.
  let devBase = '/'
  let filter = createFilter(opts.include, opts.exclude)
  let needHiresSourcemap = false
  let isProduction = true
  let projectRoot = process.cwd()
  let skipFastRefresh = opts.fastRefresh === false
  let skipReactImport = false
  let runPluginOverrides = (
    options: ReactBabelOptions,
    context: ReactBabelHookContext,
  ) => false
  let staticBabelOptions: ReactBabelOptions | undefined

  const useAutomaticRuntime = opts.jsxRuntime !== 'classic'

  // Support patterns like:
  // - import * as React from 'react';
  // - import React from 'react';
  // - import React, {useEffect} from 'react';
  const importReactRE = /(?:^|\n)import\s+(?:\*\s+as\s+)?React(?:,|\s+)/

  // Any extension, including compound ones like '.bs.js'
  const fileExtensionRE = /\.[^/\s?]+$/

  const viteBabel: Plugin = {
    name: 'vite:react-babel',
    enforce: 'pre',
    config(userConfig, { mode }) {
      // Copied from https://github.com/vitejs/vite/blob/4e9bdd4fb3654a9d43917e1cb682d3d2bad25115/packages/vite/src/node/config.ts#L477-L494

      const resolvedRoot = normalizePath(
        userConfig.root ? path.resolve(userConfig.root) : process.cwd(),
      )
      const envDir = userConfig.envDir
        ? normalizePath(path.resolve(resolvedRoot, userConfig.envDir))
        : resolvedRoot
      loadEnv(mode, envDir, resolveEnvPrefix(userConfig))

      const isProduction =
        (process.env.NODE_ENV || process.env.VITE_USER_NODE_ENV || mode) ===
        'production'

      if (opts.jsxRuntime === 'classic') {
        return {
          esbuild: {
            logOverride: {
              'this-is-undefined-in-esm': 'silent',
            },
            jsx: 'transform',
            jsxImportSource: opts.jsxImportSource,
            jsxSideEffects: opts.jsxPure === false,
          },
        }
      } else {
        return {
          esbuild: {
            jsxDev: !isProduction,
            jsx: 'automatic',
            jsxImportSource: opts.jsxImportSource,
            jsxSideEffects: opts.jsxPure === false,
          },
        }
      }
    },
    configResolved(config) {
      devBase = config.base
      projectRoot = config.root
      filter = createFilter(opts.include, opts.exclude, {
        resolve: projectRoot,
      })
      needHiresSourcemap =
        config.command === 'build' && !!config.build.sourcemap
      isProduction = config.isProduction
      skipFastRefresh ||= isProduction || config.command === 'build'

      const jsxInject = config.esbuild && config.esbuild.jsxInject
      if (jsxInject && importReactRE.test(jsxInject)) {
        skipReactImport = true
        config.logger.warn(
          '[@vitejs/plugin-react] This plugin imports React for you automatically,' +
            ' so you can stop using `esbuild.jsxInject` for that purpose.',
        )
      }

      config.plugins.forEach((plugin) => {
        const hasConflict =
          plugin.name === 'react-refresh' ||
          (plugin !== viteReactJsx && plugin.name === 'vite:react-jsx')

        if (hasConflict)
          return config.logger.warn(
            `[@vitejs/plugin-react] You should stop using "${plugin.name}" ` +
              `since this plugin conflicts with it.`,
          )
      })

      runPluginOverrides = (babelOptions, context) => {
        const hooks = config.plugins
          .map((plugin) => plugin.api?.reactBabel)
          .filter(Boolean) as ReactBabelHook[]

        if (hooks.length > 0) {
          return (runPluginOverrides = (babelOptions, context) => {
            hooks.forEach((hook) => hook(babelOptions, context, config))
            return true
          })(babelOptions, context)
        }
        runPluginOverrides = () => false
        return false
      }
    },
    async transform(code, id, options) {
      const ssr = options?.ssr === true
      // File extension could be mocked/overridden in querystring.
      const [filepath, querystring = ''] = id.split('?')
      const [extension = ''] =
        querystring.match(fileExtensionRE) ||
        filepath.match(fileExtensionRE) ||
        []

      if (/\.(?:mjs|[tj]sx?)$/.test(extension)) {
        const isJSX = extension.endsWith('x')
        const isNodeModules = id.includes('/node_modules/')
        const isProjectFile =
          !isNodeModules && (id[0] === '\0' || id.startsWith(projectRoot + '/'))

        let babelOptions = staticBabelOptions
        if (typeof opts.babel === 'function') {
          const rawOptions = opts.babel(id, { ssr })
          babelOptions = createBabelOptions(rawOptions)
          runPluginOverrides(babelOptions, { ssr, id: id })
        } else if (!babelOptions) {
          babelOptions = createBabelOptions(opts.babel)
          if (!runPluginOverrides(babelOptions, { ssr, id: id })) {
            staticBabelOptions = babelOptions
          }
        }

        const plugins = isProjectFile ? [...babelOptions.plugins] : []

        let useFastRefresh = false
        if (!skipFastRefresh && !ssr && !isNodeModules) {
          // Modules with .js or .ts extension must import React.
          const isReactModule = isJSX || importReactRE.test(code)
          if (isReactModule && filter(id)) {
            useFastRefresh = true
            plugins.push([
              await loadPlugin('react-refresh/babel'),
              { skipEnvCheck: true },
            ])
          }
        }

        let prependReactImport = false
        if (!isProjectFile || isJSX) {
          if (!useAutomaticRuntime && isProjectFile) {
            // These plugins are only needed for the classic runtime.
            if (!isProduction) {
              plugins.push(
                await loadPlugin('@babel/plugin-transform-react-jsx-self'),
                await loadPlugin('@babel/plugin-transform-react-jsx-source'),
              )
            }

            // Even if the automatic JSX runtime is not used, we can still
            // inject the React import for .jsx and .tsx modules.
            if (!skipReactImport && !importReactRE.test(code)) {
              prependReactImport = true
            }
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

        // Plugins defined through this Vite plugin are only applied
        // to modules within the project root, but "babel.config.js"
        // files can define plugins that need to be applied to every
        // module, including node_modules and linked packages.
        const shouldSkip =
          !plugins.length &&
          !babelOptions.configFile &&
          !(isProjectFile && babelOptions.babelrc)

        // Avoid parsing if no plugins exist.
        if (shouldSkip) {
          return {
            code,
            map: inputMap ?? null,
          }
        }

        const parserPlugins: typeof babelOptions.parserOpts.plugins = [
          ...babelOptions.parserOpts.plugins,
          'importMeta',
          // This plugin is applied before esbuild transforms the code,
          // so we need to enable some stage 3 syntax that is supported in
          // TypeScript and some environments already.
          'topLevelAwait',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
        ]

        if (!extension.endsWith('.ts')) {
          parserPlugins.push('jsx')
        }

        if (/\.tsx?$/.test(extension)) {
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
          if (useFastRefresh && /\$RefreshReg\$\(/.test(code)) {
            code = addRefreshWrapper(code, id)
          }
          return {
            code,
            map: result.map,
          }
        }
      }
    },
  }

  const viteReactRefresh: Plugin = {
    name: 'vite:react-refresh',
    enforce: 'pre',
    config: () => ({
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

  const reactJsxRuntimeId = 'react/jsx-runtime'
  const reactJsxDevRuntimeId = 'react/jsx-dev-runtime'
  const virtualReactJsxRuntimeId = '\0' + reactJsxRuntimeId
  const virtualReactJsxDevRuntimeId = '\0' + reactJsxDevRuntimeId
  // Adapted from https://github.com/alloc/vite-react-jsx
  const viteReactJsx: Plugin = {
    name: 'vite:react-jsx',
    enforce: 'pre',
    config() {
      return {
        optimizeDeps: {
          // We can't add `react-dom` because the dependency is `react-dom/client`
          // for React 18 while it's `react-dom` for React 17. We'd need to detect
          // what React version the user has installed.
          include: [reactJsxRuntimeId, reactJsxDevRuntimeId, 'react'],
        },
      }
    },
    resolveId(id, importer) {
      // Resolve runtime to a virtual path to be interoped.
      // Since the interop code re-imports `id`, we need to prevent re-resolving
      // to the virtual id if the importer is already the virtual id.
      if (id === reactJsxRuntimeId && importer !== virtualReactJsxRuntimeId) {
        return virtualReactJsxRuntimeId
      }
      if (
        id === reactJsxDevRuntimeId &&
        importer !== virtualReactJsxDevRuntimeId
      ) {
        return virtualReactJsxDevRuntimeId
      }
    },
    load(id) {
      // Apply manual interop
      if (id === virtualReactJsxRuntimeId) {
        return [
          `import * as jsxRuntime from ${JSON.stringify(reactJsxRuntimeId)}`,
          `export const Fragment = jsxRuntime.Fragment`,
          `export const jsx = jsxRuntime.jsx`,
          `export const jsxs = jsxRuntime.jsxs`,
        ].join('\n')
      }
      if (id === virtualReactJsxDevRuntimeId) {
        return [
          `import * as jsxRuntime from ${JSON.stringify(reactJsxDevRuntimeId)}`,
          `export const Fragment = jsxRuntime.Fragment`,
          `export const jsxDEV = jsxRuntime.jsxDEV`,
        ].join('\n')
      }
    },
  }

  return [viteBabel, viteReactRefresh, useAutomaticRuntime && viteReactJsx]
}

viteReact.preambleCode = preambleCode

function loadPlugin(path: string): Promise<any> {
  return import(path).then((module) => module.default || module)
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
