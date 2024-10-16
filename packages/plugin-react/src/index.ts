import { createFilter } from 'rolldown-vite'
import type {
  BuildOptions,
  Plugin,
  PluginOption,
  UserConfig,
} from 'rolldown-vite'
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
   * https://esbuild.github.io/api/#jsx-import-source
   * @default 'react'
   */
  jsxImportSource?: string
  /**
   * Note: Skipping React import with classic runtime is not supported from v4
   * @default "automatic"
   */
  jsxRuntime?: 'classic' | 'automatic'
}

const reactCompRE = /extends\s+(?:React\.)?(?:Pure)?Component/
const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/
const defaultIncludeRE = /\.[tj]sx?$/

export default function viteReact(opts: Options = {}): PluginOption[] {
  // Provide default values for Rollup compat.
  let devBase = '/'
  const filter = createFilter(opts.include ?? defaultIncludeRE, opts.exclude)
  const jsxImportSource = opts.jsxImportSource ?? 'react'
  const jsxImportRuntime = `${jsxImportSource}/jsx-runtime`
  const jsxImportDevRuntime = `${jsxImportSource}/jsx-dev-runtime`
  let skipFastRefresh = false

  // Support patterns like:
  // - import * as React from 'react';
  // - import React from 'react';
  // - import React, {useEffect} from 'react';
  const importReactRE = /\bimport\s+(?:\*\s+as\s+)?React\b/

  const viteBabel: Plugin = {
    name: 'vite:react',
    config(config, env) {
      const runtime = opts.jsxRuntime ?? 'automatic'
      return {
        oxc: {
          jsx: {
            runtime,
            importSource: runtime === 'automatic' ? jsxImportSource : undefined,
            refresh: env.command === 'serve',
            development: env.command === 'serve',
          },
        },
        // optimizeDeps: { esbuildOptions: { jsx: 'automatic' } },
      }
    },
    configResolved(config) {
      devBase = config.base
      skipFastRefresh =
        config.isProduction ||
        config.command === 'build' ||
        config.server.hmr === false
    },
    async transform(code, id, options) {
      if (id.includes('/node_modules/')) return

      const [filepath] = id.split('?')
      if (!filter(filepath)) return

      const ssr = options?.ssr === true

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
        if (refreshContentRE.test(code)) {
          code = addRefreshWrapper(code, id)
        } else if (reactCompRE.test(code)) {
          code = addClassComponentRefreshWrapper(code, id)
        }
        return { code }
      }
    },
  }

  // We can't add `react-dom` because the dependency is `react-dom/client`
  // for React 18 while it's `react-dom` for React 17. We'd need to detect
  // what React version the user has installed.
  const dependencies = ['react', jsxImportDevRuntime, jsxImportRuntime]

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
