import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SourceMapPayload } from 'node:module'
import { createRequire } from 'node:module'
import {
  type JscTarget,
  type Output,
  type ParserConfig,
  type ReactConfig,
  type Options as SWCOptions,
  transform,
} from '@swc/core'
import type { PluginOption } from 'vite'
import {
  addRefreshWrapper,
  getPreambleCode,
  runtimePublicPath,
  silenceUseClientWarning,
} from '@vitejs/react-common'
import * as vite from 'vite'
import { exactRegex } from '@rolldown/pluginutils'

/* eslint-disable no-restricted-globals */
const _dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url))
const resolve = createRequire(
  typeof __filename !== 'undefined' ? __filename : import.meta.url,
).resolve
/* eslint-enable no-restricted-globals */

type Options = {
  /**
   * Control where the JSX factory is imported from.
   * @default "react"
   */
  jsxImportSource?: string
  /**
   * Enable TypeScript decorators. Requires experimentalDecorators in tsconfig.
   * @default false
   */
  tsDecorators?: boolean
  /**
   * Use SWC plugins. Enable SWC at build time.
   * @default undefined
   */
  plugins?: [string, Record<string, any>][]
  /**
   * Set the target for SWC in dev. This can avoid to down-transpile private class method for example.
   * For production target, see https://vite.dev/config/build-options.html#build-target
   * @default "es2020"
   */
  devTarget?: JscTarget
  /**
   * Override the default include list (.ts, .tsx, .mts, .jsx, .mdx).
   * This requires to redefine the config for any file you want to be included.
   * If you want to trigger fast refresh on compiled JS, use `jsx: true`.
   * Exclusion of node_modules should be handled by the function if needed.
   */
  parserConfig?: (id: string) => ParserConfig | undefined
  /**
   * React Fast Refresh runtime URL prefix.
   * Useful in a module federation context to enable HMR by specifying
   * the host application URL in a Vite config of a remote application.
   * @example
   * reactRefreshHost: 'http://localhost:3000'
   */
  reactRefreshHost?: string
  /**
   * The future of Vite is with OXC, and from the beginning this was a design choice
   * to not exposed too many specialties from SWC so that Vite React users can move to
   * another transformer later.
   * Also debugging why some specific version of decorators with some other unstable/legacy
   * feature doesn't work is not fun, so we won't provide support for it, hence the name `useAtYourOwnRisk`
   */
  useAtYourOwnRisk_mutateSwcOptions?: (options: SWCOptions) => void

  /**
   * If set, disables the recommendation to use `@vitejs/plugin-react-oxc`
   */
  disableOxcRecommendation?: boolean
}

const react = (_options?: Options): PluginOption[] => {
  let hmrDisabled = false
  const options = {
    jsxImportSource: _options?.jsxImportSource ?? 'react',
    tsDecorators: _options?.tsDecorators,
    plugins: _options?.plugins
      ? _options?.plugins.map((el): typeof el => [resolve(el[0]), el[1]])
      : undefined,
    devTarget: _options?.devTarget ?? 'es2020',
    parserConfig: _options?.parserConfig,
    reactRefreshHost: _options?.reactRefreshHost,
    useAtYourOwnRisk_mutateSwcOptions:
      _options?.useAtYourOwnRisk_mutateSwcOptions,
    disableOxcRecommendation: _options?.disableOxcRecommendation,
  }

  return [
    {
      name: 'vite:react-swc:resolve-runtime',
      apply: 'serve',
      enforce: 'pre', // Run before Vite default resolve to avoid syscalls
      resolveId: {
        filter: { id: exactRegex(runtimePublicPath) },
        handler: (id) => (id === runtimePublicPath ? id : undefined),
      },
      load: {
        filter: { id: exactRegex(runtimePublicPath) },
        handler: (id) =>
          id === runtimePublicPath
            ? readFileSync(
                join(_dirname, 'refresh-runtime.js'),
                'utf-8',
              ).replace(
                /__README_URL__/g,
                'https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react-swc',
              )
            : undefined,
      },
    },
    {
      name: 'vite:react-swc',
      apply: 'serve',
      config: () => ({
        esbuild: false,
        // NOTE: oxc option only exists in rolldown-vite
        oxc: false,
        optimizeDeps: {
          include: [`${options.jsxImportSource}/jsx-dev-runtime`],
          esbuildOptions: { jsx: 'automatic' },
        },
      }),
      configResolved(config) {
        if (config.server.hmr === false) hmrDisabled = true
        const mdxIndex = config.plugins.findIndex(
          (p) => p.name === '@mdx-js/rollup',
        )
        if (
          mdxIndex !== -1 &&
          mdxIndex >
            config.plugins.findIndex((p) => p.name === 'vite:react-swc')
        ) {
          throw new Error(
            '[vite:react-swc] The MDX plugin should be placed before this plugin',
          )
        }

        /*
         * Suggest to use vite-plugin-react-oxc if `rolldown-vite` is used and:
         * No swc plugins are set
         * mutateSwcOptions is not set
         */
        if (
          'rolldownVersion' in vite &&
          !options.disableOxcRecommendation &&
          !options.useAtYourOwnRisk_mutateSwcOptions &&
          !options.plugins
        ) {
          console.warn(
            '[vite:react-swc] We recommend switching to `vite-plugin-react-oxc` for improved performance as no swc plugins are used. More information at https://vite.dev/rolldown',
          )
        }
      },
      transformIndexHtml: (_, config) => {
        if (!hmrDisabled) {
          return [
            {
              tag: 'script',
              attrs: { type: 'module' },
              children: getPreambleCode(config.server!.config.base),
            },
          ]
        }
      },
      async transform(code, _id, transformOptions) {
        const id = _id.split('?')[0]
        const refresh = !transformOptions?.ssr && !hmrDisabled

        const result = await transformWithOptions(
          id,
          code,
          options.devTarget,
          options,
          {
            refresh,
            development: true,
            runtime: 'automatic',
            importSource: options.jsxImportSource,
          },
        )
        if (!result) return
        if (!refresh) return result

        return addRefreshWrapper<SourceMapPayload>(
          result.code,
          result.map!,
          '@vitejs/plugin-react-swc',
          id,
          options.reactRefreshHost,
        )
      },
    },
    options.plugins
      ? {
          name: 'vite:react-swc',
          apply: 'build',
          enforce: 'pre', // Run before esbuild
          config: (userConfig) => ({
            build: silenceUseClientWarning(userConfig),
          }),
          transform: (code, _id) =>
            transformWithOptions(_id.split('?')[0], code, 'esnext', options, {
              runtime: 'automatic',
              importSource: options.jsxImportSource,
            }),
        }
      : {
          name: 'vite:react-swc',
          apply: 'build',
          config: (userConfig) => ({
            build: silenceUseClientWarning(userConfig),
            esbuild: {
              jsx: 'automatic',
              jsxImportSource: options.jsxImportSource,
              tsconfigRaw: {
                compilerOptions: { useDefineForClassFields: true },
              },
            },
          }),
        },
  ]
}

const transformWithOptions = async (
  id: string,
  code: string,
  target: JscTarget,
  options: Options,
  reactConfig: ReactConfig,
) => {
  const decorators = options?.tsDecorators ?? false
  const parser: ParserConfig | undefined = options.parserConfig
    ? options.parserConfig(id)
    : id.endsWith('.tsx')
      ? { syntax: 'typescript', tsx: true, decorators }
      : id.endsWith('.ts') || id.endsWith('.mts')
        ? { syntax: 'typescript', tsx: false, decorators }
        : id.endsWith('.jsx')
          ? { syntax: 'ecmascript', jsx: true }
          : id.endsWith('.mdx')
            ? // JSX is required to trigger fast refresh transformations, even if MDX already transforms it
              { syntax: 'ecmascript', jsx: true }
            : undefined
  if (!parser) return

  let result: Output
  try {
    const swcOptions: SWCOptions = {
      filename: id,
      swcrc: false,
      configFile: false,
      sourceMaps: true,
      jsc: {
        target,
        parser,
        experimental: { plugins: options.plugins },
        transform: {
          useDefineForClassFields: true,
          react: reactConfig,
        },
      },
    }
    if (options.useAtYourOwnRisk_mutateSwcOptions) {
      options.useAtYourOwnRisk_mutateSwcOptions(swcOptions)
    }
    result = await transform(code, swcOptions)
  } catch (e: any) {
    const message: string = e.message
    const fileStartIndex = message.indexOf('╭─[')
    if (fileStartIndex !== -1) {
      const match = message.slice(fileStartIndex).match(/:(\d+):(\d+)\]/)
      if (match) {
        e.line = match[1]
        e.column = match[2]
      }
    }
    throw e
  }

  return result
}

export default react
