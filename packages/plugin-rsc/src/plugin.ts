import assert from 'node:assert'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequestListener } from '@remix-run/node-fetch-server'
import * as esModuleLexer from 'es-module-lexer'
import MagicString from 'magic-string'
import * as vite from 'vite'
import {
  type BuilderOptions,
  type DevEnvironment,
  type EnvironmentModuleNode,
  type Plugin,
  type ResolvedConfig,
  type Rollup,
  type RunnableDevEnvironment,
  type ViteDevServer,
  defaultServerConditions,
  isCSSRequest,
  normalizePath,
  parseAstAsync,
} from 'vite'
import { crawlFrameworkPkgs } from 'vitefu'
import vitePluginRscCore from './core/plugin'
import {
  type TransformWrapExportFilter,
  hasDirective,
  transformDirectiveProxyExport,
  transformServerActionServer,
  transformWrapExport,
} from './transforms'
import { generateEncryptionKey, toBase64 } from './utils/encryption-utils'
import { createRpcServer } from './utils/rpc'
import {
  cleanUrl,
  evalValue,
  normalizeViteImportAnalysisUrl,
  prepareError,
} from './plugins/vite-utils'
import { cjsModuleRunnerPlugin } from './plugins/cjs'
import {
  createVirtualPlugin,
  getEntrySource,
  hashString,
  normalizeRelativePath,
  sortObject,
  withRollupError,
} from './plugins/utils'
import { createDebug } from '@hiogawa/utils'
import { scanBuildStripPlugin } from './plugins/scan'
import { validateImportPlugin } from './plugins/validate-import'
import { vitePluginFindSourceMapURL } from './plugins/find-source-map-url'
import { parseCssVirtual, toCssVirtual, parseIdQuery } from './plugins/shared'

const isRolldownVite = 'rolldownVersion' in vite

const BUILD_ASSETS_MANIFEST_NAME = '__vite_rsc_assets_manifest.js'

type ClientReferenceMeta = {
  importId: string
  // same as `importId` during dev. hashed id during build.
  referenceKey: string
  packageSource?: string
  // build only for tree-shaking unused export
  exportNames: string[]
  renderedExports: string[]
  serverChunk?: string
  groupChunkId?: string
}

type ServerRerferenceMeta = {
  importId: string
  referenceKey: string
  // TODO: tree shake unused server functions
  exportNames: string[]
}

const PKG_NAME = '@vitejs/plugin-rsc'
const REACT_SERVER_DOM_NAME = `${PKG_NAME}/vendor/react-server-dom`

// dev-only wrapper virtual module of rollupOptions.input.index
const VIRTUAL_ENTRIES = {
  browser: 'virtual:vite-rsc/entry-browser',
}

const require = createRequire(import.meta.url)

function resolvePackage(name: string) {
  return pathToFileURL(require.resolve(name)).href
}

export type { RscPluginManager }

class RscPluginManager {
  server!: ViteDevServer
  config!: ResolvedConfig
  rscBundle!: Rollup.OutputBundle
  buildAssetsManifest: AssetsManifest | undefined
  isScanBuild: boolean = false
  clientReferenceMetaMap: Record<string, ClientReferenceMeta> = {}
  clientReferenceGroups: Record</* group name*/ string, ClientReferenceMeta[]> =
    {}
  serverReferenceMetaMap: Record<string, ServerRerferenceMeta> = {}
  serverResourcesMetaMap: Record<string, { key: string }> = {}

  stabilize(): void {
    // sort for stable build
    this.clientReferenceMetaMap = sortObject(this.clientReferenceMetaMap)
    this.serverResourcesMetaMap = sortObject(this.serverResourcesMetaMap)
  }

  toRelativeId(id: string): string {
    return normalizePath(path.relative(this.config.root, id))
  }
}

export type RscPluginOptions = {
  /**
   * shorthand for configuring `environments.(name).build.rollupOptions.input.index`
   */
  entries?: Partial<Record<'client' | 'ssr' | 'rsc', string>>

  /** @deprecated use `serverHandler: false` */
  disableServerHandler?: boolean

  /** @default { enviornmentName: "rsc", entryName: "index" } */
  serverHandler?:
    | {
        environmentName: string
        entryName: string
      }
    | false

  /** @default false */
  loadModuleDevProxy?: boolean

  rscCssTransform?: false | { filter?: (id: string) => boolean }

  /** @deprecated use "DEBUG=vite-env:*" to see warnings. */
  ignoredPackageWarnings?: (string | RegExp)[]

  /**
   * This option allows customizing how client build copies assets from server build.
   * By default, all assets are copied, but frameworks can establish server asset convention
   * to tighten security using this option.
   */
  copyServerAssetsToClient?: (fileName: string) => boolean

  /**
   * This option allows disabling action closure encryption for debugging purpose.
   * @default true
   */
  enableActionEncryption?: boolean

  /**
   * By default, the plugin uses a build-time generated encryption key for
   * "use server" closure argument binding.
   * This can be overwritten by configuring `defineEncryptionKey` option,
   * for example, to obtain a key through environment variable during runtime.
   * cf. https://nextjs.org/docs/app/guides/data-security#overwriting-encryption-keys-advanced
   */
  defineEncryptionKey?: string

  /** Escape hatch for Waku's `allowServer` */
  keepUseCientProxy?: boolean

  /**
   * Enable build-time validation of 'client-only' and 'server-only' imports
   * @default true
   */
  validateImports?: boolean

  /**
   * use `Plugin.buildApp` hook (introduced on Vite 7) instead of `builder.buildApp` configuration
   * for better composability with other plugins.
   * @default false
   */
  useBuildAppHook?: boolean

  /**
   * Custom environment configuration
   * @experimental
   * @default { browser: 'client', ssr: 'ssr', rsc: 'rsc' }
   */
  environment?: {
    browser?: string
    ssr?: string
    rsc?: string
  }

  /**
   * Custom chunking strategy for client reference modules.
   *
   * This function allows you to group multiple client components into
   * custom chunks instead of having each module in its own chunk.
   * By default, client chunks are grouped by `meta.serverChunk`.
   */
  clientChunks?: (meta: {
    /** client reference module id */
    id: string
    /** normalized client reference module id */
    normalizedId: string
    /** server chunk which includes a corresponding client reference proxy module */
    serverChunk: string
  }) => string | undefined
}

export type PluginApi = {
  manager: RscPluginManager
}

/** @experimental */
export function getPluginApi(config: ResolvedConfig): PluginApi | undefined {
  const plugin = config.plugins.find((p) => p.name === 'rsc:minimal')
  return plugin?.api as PluginApi | undefined
}

/** @experimental */
export function vitePluginRscMinimal(
  rscPluginOptions: RscPluginOptions = {},
  manager: RscPluginManager = new RscPluginManager(),
): Plugin[] {
  return [
    {
      name: 'rsc:minimal',
      enforce: 'pre',
      api: {
        manager,
      } satisfies PluginApi,
      async config() {
        await esModuleLexer.init
      },
      configResolved(config) {
        manager.config = config
        // ensure outDir is fully resolved to take custom root into account
        // https://github.com/vitejs/vite/blob/946831f986cb797009b8178659d2b31f570c44ff/packages/vite/src/node/build.ts#L574
        for (const e of Object.values(config.environments)) {
          e.build.outDir = path.resolve(config.root, e.build.outDir)
        }
      },
      configureServer(server_) {
        manager.server = server_
      },
    },
    {
      name: 'rsc:vite-client-raw-import',
      transform: {
        order: 'post',
        handler(code) {
          if (code.includes('__vite_rsc_raw_import__')) {
            // inject dynamic import last to avoid Vite adding `?import` query
            // to client references (and browser mode server references)
            return code.replace('__vite_rsc_raw_import__', 'import')
          }
        },
      },
    },
    ...vitePluginRscCore(),
    ...vitePluginUseClient(rscPluginOptions, manager),
    ...vitePluginUseServer(rscPluginOptions, manager),
    ...vitePluginDefineEncryptionKey(rscPluginOptions),
    scanBuildStripPlugin({ manager }),
  ]
}

export default function vitePluginRsc(
  rscPluginOptions: RscPluginOptions = {},
): Plugin[] {
  const manager = new RscPluginManager()

  const buildApp: NonNullable<BuilderOptions['buildApp']> = async (builder) => {
    // no-ssr case
    // rsc -> client -> rsc -> client
    if (!builder.environments.ssr?.config.build.rollupOptions.input) {
      manager.isScanBuild = true
      builder.environments.rsc!.config.build.write = false
      builder.environments.client!.config.build.write = false
      await builder.build(builder.environments.rsc!)
      await builder.build(builder.environments.client!)
      manager.isScanBuild = false
      builder.environments.rsc!.config.build.write = true
      builder.environments.client!.config.build.write = true
      await builder.build(builder.environments.rsc!)
      manager.stabilize()
      await builder.build(builder.environments.client!)
      writeAssetsManifest(['rsc'])
      return
    }

    // rsc -> ssr -> rsc -> client -> ssr
    manager.isScanBuild = true
    builder.environments.rsc!.config.build.write = false
    builder.environments.ssr!.config.build.write = false
    await builder.build(builder.environments.rsc!)
    await builder.build(builder.environments.ssr!)
    manager.isScanBuild = false
    builder.environments.rsc!.config.build.write = true
    builder.environments.ssr!.config.build.write = true
    await builder.build(builder.environments.rsc!)
    manager.stabilize()
    await builder.build(builder.environments.client!)
    await builder.build(builder.environments.ssr!)
    writeAssetsManifest(['ssr', 'rsc'])
  }

  function writeAssetsManifest(environmentNames: string[]) {
    // output client manifest to non-client build directly.
    // this makes server build to be self-contained and deploy-able for cloudflare.
    const assetsManifestCode = `export default ${serializeValueWithRuntime(
      manager.buildAssetsManifest,
    )}`
    for (const name of environmentNames) {
      const manifestPath = path.join(
        manager.config.environments[name]!.build.outDir,
        BUILD_ASSETS_MANIFEST_NAME,
      )
      fs.writeFileSync(manifestPath, assetsManifestCode)
    }
  }

  return [
    {
      name: 'rsc',
      async config(config, env) {
        // crawl packages with "react" in "peerDependencies" to bundle react deps on server
        // see https://github.com/svitejs/vitefu/blob/d8d82fa121e3b2215ba437107093c77bde51b63b/src/index.js#L95-L101
        const result = await crawlFrameworkPkgs({
          root: process.cwd(),
          isBuild: env.command === 'build',
          isFrameworkPkgByJson(pkgJson) {
            if ([PKG_NAME, 'react-dom'].includes(pkgJson.name)) {
              return
            }
            const deps = pkgJson['peerDependencies']
            return deps && 'react' in deps
          },
        })
        const noExternal = [
          'react',
          'react-dom',
          'server-only',
          'client-only',
          PKG_NAME,
          ...result.ssr.noExternal.sort(),
        ]

        return {
          appType: 'custom',
          define: {
            'import.meta.env.__vite_rsc_build__': JSON.stringify(
              env.command === 'build',
            ),
          },
          environments: {
            client: {
              build: {
                outDir:
                  config.environments?.client?.build?.outDir ?? 'dist/client',
                rollupOptions: {
                  input: rscPluginOptions.entries?.client && {
                    index: rscPluginOptions.entries.client,
                  },
                },
              },
              optimizeDeps: {
                include: [
                  'react-dom/client',
                  `${REACT_SERVER_DOM_NAME}/client.browser`,
                ],
                exclude: [PKG_NAME],
              },
            },
            ssr: {
              build: {
                outDir: config.environments?.ssr?.build?.outDir ?? 'dist/ssr',
                rollupOptions: {
                  input: rscPluginOptions.entries?.ssr && {
                    index: rscPluginOptions.entries.ssr,
                  },
                },
              },
              resolve: {
                noExternal,
              },
              optimizeDeps: {
                include: [
                  'react',
                  'react-dom',
                  'react/jsx-runtime',
                  'react/jsx-dev-runtime',
                  'react-dom/server.edge',
                  'react-dom/static.edge',
                  `${REACT_SERVER_DOM_NAME}/client.edge`,
                ],
                exclude: [PKG_NAME],
              },
            },
            rsc: {
              build: {
                outDir: config.environments?.rsc?.build?.outDir ?? 'dist/rsc',
                emitAssets: true,
                rollupOptions: {
                  input: rscPluginOptions.entries?.rsc && {
                    index: rscPluginOptions.entries.rsc,
                  },
                },
              },
              resolve: {
                conditions: ['react-server', ...defaultServerConditions],
                noExternal,
              },
              optimizeDeps: {
                include: [
                  'react',
                  'react-dom',
                  'react/jsx-runtime',
                  'react/jsx-dev-runtime',
                  `${REACT_SERVER_DOM_NAME}/server.edge`,
                  `${REACT_SERVER_DOM_NAME}/client.edge`,
                ],
                exclude: [PKG_NAME],
              },
            },
          },
          builder: {
            sharedPlugins: true,
            sharedConfigBuild: true,
            buildApp: rscPluginOptions.useBuildAppHook ? undefined : buildApp,
          },
        }
      },
      buildApp: rscPluginOptions.useBuildAppHook ? buildApp : undefined,
      configureServer(server) {
        ;(globalThis as any).__viteRscDevServer = server

        // intercept client hmr to propagate client boundary invalidation to server environment
        const oldSend = server.environments.client.hot.send
        server.environments.client.hot.send = async function (
          this,
          ...args: any[]
        ) {
          const e = args[0] as vite.UpdatePayload
          if (e && typeof e === 'object' && e.type === 'update') {
            for (const update of e.updates) {
              if (update.type === 'js-update') {
                const mod =
                  server.environments.client.moduleGraph.urlToModuleMap.get(
                    update.path,
                  )
                if (mod && mod.id && manager.clientReferenceMetaMap[mod.id]) {
                  const serverMod =
                    server.environments.rsc!.moduleGraph.getModuleById(mod.id)
                  if (serverMod) {
                    server.environments.rsc!.moduleGraph.invalidateModule(
                      serverMod,
                    )
                  }
                }
              }
            }
          }
          return oldSend.apply(this, args as any)
        }

        if (rscPluginOptions.disableServerHandler) return
        if (rscPluginOptions.serverHandler === false) return
        const options = rscPluginOptions.serverHandler ?? {
          environmentName: 'rsc',
          entryName: 'index',
        }
        const environment = server.environments[
          options.environmentName
        ] as RunnableDevEnvironment
        const source = getEntrySource(environment.config, options.entryName)

        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              // resolve before `runner.import` to workaround https://github.com/vitejs/vite/issues/19975
              const resolved =
                await environment.pluginContainer.resolveId(source)
              assert(
                resolved,
                `[vite-rsc] failed to resolve server handler '${source}'`,
              )
              const mod = await environment.runner.import(resolved.id)
              // expose original request url to server handler.
              // for example, this restores `base` which is automatically stripped by Vite.
              // https://github.com/vitejs/vite/blob/84079a84ad94de4c1ef4f1bdb2ab448ff2c01196/packages/vite/src/node/server/middlewares/base.ts#L18-L20
              req.url = req.originalUrl ?? req.url
              // ensure catching rejected promise
              // https://github.com/mjackson/remix-the-web/blob/b5aa2ae24558f5d926af576482caf6e9b35461dc/packages/node-fetch-server/src/lib/request-listener.ts#L87
              await createRequestListener(mod.default)(req, res)
            } catch (e) {
              next(e)
            }
          })
        }
      },
      async configurePreviewServer(server) {
        if (rscPluginOptions.disableServerHandler) return
        if (rscPluginOptions.serverHandler === false) return
        const options = rscPluginOptions.serverHandler ?? {
          environmentName: 'rsc',
          entryName: 'index',
        }

        const entryFile = path.join(
          manager.config.environments[options.environmentName]!.build.outDir,
          `${options.entryName}.js`,
        )
        const entry = pathToFileURL(entryFile).href
        const mod = await import(/* @vite-ignore */ entry)
        const handler = createRequestListener(mod.default)

        // disable compressions since it breaks html streaming
        // https://github.com/vitejs/vite/blob/9f5c59f07aefb1756a37bcb1c0aff24d54288950/packages/vite/src/node/preview.ts#L178
        server.middlewares.use((req, _res, next) => {
          delete req.headers['accept-encoding']
          next()
        })

        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              req.url = req.originalUrl ?? req.url
              await handler(req, res)
            } catch (e) {
              next(e)
            }
          })
        }
      },
      async hotUpdate(ctx) {
        if (isCSSRequest(ctx.file)) {
          if (this.environment.name === 'client') {
            // filter out `.css?direct` (injected by SSR) to avoid browser full reload
            // when changing non-self accepting css such as `module.css`.
            return ctx.modules.filter(
              (m) => !(m.id?.includes('?direct') && !m.isSelfAccepting),
            )
          }
        }

        const ids = ctx.modules.map((mod) => mod.id).filter((v) => v !== null)
        if (ids.length === 0) return

        // handle client -> server switch (i.e. "use client" removal)
        // by eagerly transforming new module on "rsc" environment.
        if (this.environment.name === 'rsc') {
          for (const mod of ctx.modules) {
            if (
              mod.type === 'js' &&
              mod.id &&
              mod.id in manager.clientReferenceMetaMap
            ) {
              try {
                await this.environment.transformRequest(mod.url)
              } catch {}
            }
          }
        }

        // a shared component/module will have `isInsideClientBoundary = false` on `rsc` environment
        // and `isInsideClientBoundary = true` on `client` environment,
        // which means both server hmr and client hmr will be triggered.
        function isInsideClientBoundary(mods: EnvironmentModuleNode[]) {
          const visited = new Set<string>()
          function recurse(mod: EnvironmentModuleNode): boolean {
            if (!mod.id) return false
            if (manager.clientReferenceMetaMap[mod.id]) return true
            if (visited.has(mod.id)) return false
            visited.add(mod.id)
            for (const importer of mod.importers) {
              if (recurse(importer)) {
                return true
              }
            }
            return false
          }
          return mods.some((mod) => recurse(mod))
        }

        if (!isInsideClientBoundary(ctx.modules)) {
          if (this.environment.name === 'rsc') {
            // detect if this module is only created as css deps (e.g. tailwind)
            // (NOTE: this is not necessary since Vite 7.1.0-beta.0 https://github.com/vitejs/vite/pull/20391 )
            if (ctx.modules.length === 1) {
              const importers = [...ctx.modules[0]!.importers]
              if (
                importers.length > 0 &&
                importers.every((m) => m.id && isCSSRequest(m.id))
              ) {
                return []
              }
            }

            // transform js to surface syntax errors
            for (const mod of ctx.modules) {
              if (mod.type === 'js') {
                try {
                  await this.environment.transformRequest(mod.url)
                } catch (e) {
                  manager.server.environments.client.hot.send({
                    type: 'error',
                    err: prepareError(e as any),
                  })
                  throw e
                }
              }
            }
            // server hmr
            ctx.server.environments.client.hot.send({
              type: 'custom',
              event: 'rsc:update',
              data: {
                file: ctx.file,
              },
            })
          }

          if (this.environment.name === 'client') {
            // Server files can be included in client module graph, for example,
            // when `addWatchFile` is used to track js files as style dependency (e.g. tailwind)
            // In this case, reload all importers (for css hmr), and return empty modules to avoid full-reload.
            // (NOTE: this is not necessary since Vite 7.1.0-beta.0 https://github.com/vitejs/vite/pull/20391 )
            const env = ctx.server.environments.rsc!
            const mod = env.moduleGraph.getModuleById(ctx.file)
            if (mod) {
              for (const clientMod of ctx.modules) {
                for (const importer of clientMod.importers) {
                  if (importer.id && isCSSRequest(importer.id)) {
                    await this.environment.reloadModule(importer)
                  }
                }
              }
              return []
            }
          }
        }
      },
    },
    {
      // backward compat: `loadSsrModule(name)` implemented as `loadModule("ssr", name)`
      name: 'rsc:load-ssr-module',
      transform(code) {
        if (code.includes('import.meta.viteRsc.loadSsrModule(')) {
          return code.replaceAll(
            `import.meta.viteRsc.loadSsrModule(`,
            `import.meta.viteRsc.loadModule("ssr", `,
          )
        }
      },
    },
    {
      // allow loading entry module in other environment by
      // - (dev) rewriting to `server.environments[<env>].runner.import(<entry>)`
      // - (build) rewriting to external `import("../<env>/<entry>.js")`
      name: 'rsc:load-environment-module',
      async transform(code) {
        if (!code.includes('import.meta.viteRsc.loadModule')) return
        const { server } = manager
        const s = new MagicString(code)
        for (const match of code.matchAll(
          /import\.meta\.viteRsc\.loadModule\(([\s\S]*?)\)/dg,
        )) {
          const argCode = match[1]!.trim()
          const [environmentName, entryName] = evalValue(`[${argCode}]`)
          let replacement: string
          if (
            this.environment.mode === 'dev' &&
            rscPluginOptions.loadModuleDevProxy
          ) {
            const origin = server.resolvedUrls?.local[0]
            assert(origin, '[vite-rsc] no server for loadModueleDevProxy')
            const endpoint =
              origin +
              '__vite_rsc_load_module_dev_proxy?' +
              new URLSearchParams({ environmentName, entryName })
            replacement = `__vite_rsc_rpc.createRpcClient(${JSON.stringify({
              endpoint,
            })})`
            s.prepend(
              `import * as __vite_rsc_rpc from "@vitejs/plugin-rsc/utils/rpc";`,
            )
          } else if (this.environment.mode === 'dev') {
            const environment = server.environments[environmentName]!
            const source = getEntrySource(environment.config, entryName)
            const resolved = await environment.pluginContainer.resolveId(source)
            assert(resolved, `[vite-rsc] failed to resolve entry '${source}'`)
            replacement =
              `globalThis.__viteRscDevServer.environments[${JSON.stringify(
                environmentName,
              )}]` + `.runner.import(${JSON.stringify(resolved.id)})`
          } else {
            replacement = JSON.stringify(
              `__vite_rsc_load_module:${this.environment.name}:${environmentName}:${entryName}`,
            )
          }
          const [start, end] = match.indices![0]!
          s.overwrite(start, end, replacement)
        }
        if (s.hasChanged()) {
          return {
            code: s.toString(),
            map: s.generateMap({ hires: 'boundary' }),
          }
        }
      },
      renderChunk(code, chunk) {
        if (!code.includes('__vite_rsc_load_module')) return
        const { config } = manager
        const s = new MagicString(code)
        for (const match of code.matchAll(
          /['"]__vite_rsc_load_module:(\w+):(\w+):(\w+)['"]/dg,
        )) {
          const [fromEnv, toEnv, entryName] = match.slice(1)
          const importPath = normalizeRelativePath(
            path.relative(
              path.join(
                config.environments[fromEnv!]!.build.outDir,
                chunk.fileName,
                '..',
              ),
              path.join(
                config.environments[toEnv!]!.build.outDir,
                // TODO: this breaks when custom entyFileNames
                `${entryName}.js`,
              ),
            ),
          )
          const replacement = `(import(${JSON.stringify(importPath)}))`
          const [start, end] = match.indices![0]!
          s.overwrite(start, end, replacement)
        }
        if (s.hasChanged()) {
          return {
            code: s.toString(),
            map: s.generateMap({ hires: 'boundary' }),
          }
        }
      },
    },
    {
      name: 'vite-rsc-load-module-dev-proxy',
      apply: () => !!rscPluginOptions.loadModuleDevProxy,
      configureServer(server) {
        async function createHandler(url: URL) {
          const { environmentName, entryName } = Object.fromEntries(
            url.searchParams,
          )
          assert(environmentName)
          assert(entryName)
          const environment = server.environments[
            environmentName
          ] as RunnableDevEnvironment
          const source = getEntrySource(environment.config, entryName)
          const resolvedEntry =
            await environment.pluginContainer.resolveId(source)
          assert(
            resolvedEntry,
            `[vite-rsc] failed to resolve entry '${source}'`,
          )
          const runnerProxy = new Proxy(
            {},
            {
              get(_target, p, _receiver) {
                if (typeof p !== 'string' || p === 'then') {
                  return
                }
                return async (...args: any[]) => {
                  const mod = await environment.runner.import(resolvedEntry.id)
                  return (mod as any)[p](...args)
                }
              },
            },
          )
          return createRpcServer(runnerProxy)
        }

        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url ?? '/', `http://localhost`)
          if (url.pathname === '/__vite_rsc_load_module_dev_proxy') {
            try {
              const handler = await createHandler(url)
              createRequestListener(handler)(req, res)
            } catch (e) {
              next(e)
            }
            return
          }
          next()
        })
      },
    },
    {
      name: 'rsc:virtual:vite-rsc/assets-manifest',
      resolveId(source) {
        if (source === 'virtual:vite-rsc/assets-manifest') {
          if (this.environment.mode === 'build') {
            return { id: source, external: true }
          }
          return `\0` + source
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc/assets-manifest') {
          assert(this.environment.name !== 'client')
          assert(this.environment.mode === 'dev')
          const entryUrl = assetsURL(
            '@id/__x00__' + VIRTUAL_ENTRIES.browser,
            manager,
          )
          const manifest: AssetsManifest = {
            bootstrapScriptContent: `import(${serializeValueWithRuntime(entryUrl)})`,
            clientReferenceDeps: {},
          }
          return `export default ${JSON.stringify(manifest, null, 2)}`
        }
      },
      // client build
      generateBundle(_options, bundle) {
        // copy assets from rsc build to client build
        if (this.environment.name === 'rsc') {
          manager.rscBundle = bundle
        }

        if (this.environment.name === 'client') {
          const filterAssets =
            rscPluginOptions.copyServerAssetsToClient ?? (() => true)
          const rscBuildOptions = manager.config.environments.rsc!.build
          const rscViteManifest =
            typeof rscBuildOptions.manifest === 'string'
              ? rscBuildOptions.manifest
              : rscBuildOptions.manifest && '.vite/manifest.json'
          for (const asset of Object.values(manager.rscBundle)) {
            if (asset.fileName === rscViteManifest) continue
            if (asset.type === 'asset' && filterAssets(asset.fileName)) {
              this.emitFile({
                type: 'asset',
                fileName: asset.fileName,
                source: asset.source,
              })
            }
          }

          const serverResources: Record<string, AssetDeps> = {}
          const rscAssetDeps = collectAssetDeps(manager.rscBundle)
          for (const [id, meta] of Object.entries(
            manager.serverResourcesMetaMap,
          )) {
            serverResources[meta.key] = assetsURLOfDeps(
              {
                js: [],
                css: rscAssetDeps[id]?.deps.css ?? [],
              },
              manager,
            )
          }

          const assetDeps = collectAssetDeps(bundle)
          const entry = Object.values(assetDeps).find(
            (v) => v.chunk.name === 'index',
          )
          assert(entry)
          const entryUrl = assetsURL(entry.chunk.fileName, manager)
          const clientReferenceDeps: Record<string, AssetDeps> = {}
          for (const meta of Object.values(manager.clientReferenceMetaMap)) {
            const deps: AssetDeps = assetDeps[meta.groupChunkId!]?.deps ?? {
              js: [],
              css: [],
            }
            clientReferenceDeps[meta.referenceKey] = assetsURLOfDeps(
              mergeAssetDeps(deps, entry.deps),
              manager,
            )
          }
          let bootstrapScriptContent: string | RuntimeAsset
          if (typeof entryUrl === 'string') {
            bootstrapScriptContent = `import(${JSON.stringify(entryUrl)})`
          } else {
            bootstrapScriptContent = new RuntimeAsset(
              `"import(" + JSON.stringify(${entryUrl.runtime}) + ")"`,
            )
          }
          manager.buildAssetsManifest = {
            bootstrapScriptContent,
            clientReferenceDeps,
            serverResources,
          }
        }
      },
      // non-client builds can load assets manifest as external
      renderChunk(code, chunk) {
        if (code.includes('virtual:vite-rsc/assets-manifest')) {
          assert(this.environment.name !== 'client')
          const replacement = normalizeRelativePath(
            path.relative(
              path.join(chunk.fileName, '..'),
              BUILD_ASSETS_MANIFEST_NAME,
            ),
          )
          code = code.replaceAll(
            'virtual:vite-rsc/assets-manifest',
            () => replacement,
          )
          return { code }
        }
        return
      },
    },
    createVirtualPlugin('vite-rsc/bootstrap-script-content', function () {
      assert(this.environment.name !== 'client')
      return `\
import assetsManifest from "virtual:vite-rsc/assets-manifest";
export default assetsManifest.bootstrapScriptContent;
`
    }),
    {
      name: 'rsc:bootstrap-script-content',
      async transform(code) {
        if (
          !code.includes('loadBootstrapScriptContent') ||
          !/import\s*\.\s*meta\s*\.\s*viteRsc\s*\.\s*loadBootstrapScriptContent/.test(
            code,
          )
        ) {
          return
        }

        assert(this.environment.name !== 'client')
        const output = new MagicString(code)

        for (const match of code.matchAll(
          /import\s*\.\s*meta\s*\.\s*viteRsc\s*\.\s*loadBootstrapScriptContent\(([\s\S]*?)\)/dg,
        )) {
          const argCode = match[1]!.trim()
          const entryName = evalValue(argCode)
          assert(
            entryName,
            `[vite-rsc] expected 'loadBootstrapScriptContent("index")' but got ${argCode}`,
          )
          let replacement: string = `Promise.resolve(__vite_rsc_assets_manifest.bootstrapScriptContent)`
          const [start, end] = match.indices![0]!
          output.overwrite(start, end, replacement)
        }
        if (output.hasChanged()) {
          if (!code.includes('__vite_rsc_assets_manifest')) {
            output.prepend(
              `import __vite_rsc_assets_manifest from "virtual:vite-rsc/assets-manifest";`,
            )
          }
          return {
            code: output.toString(),
            map: output.generateMap({ hires: 'boundary' }),
          }
        }
      },
    },
    createVirtualPlugin(
      VIRTUAL_ENTRIES.browser.slice('virtual:'.length),
      async function () {
        assert(this.environment.mode === 'dev')
        let code = ''
        // enable hmr only when react plugin is available
        const resolved = await this.resolve('/@react-refresh')
        if (resolved) {
          code += `
import RefreshRuntime from "/@react-refresh";
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
`
        }
        const source = getEntrySource(this.environment.config, 'index')
        const resolvedEntry = await this.resolve(source)
        assert(resolvedEntry, `[vite-rsc] failed to resolve entry '${source}'`)
        code += `await import(${JSON.stringify(resolvedEntry.id)});`
        // server css is normally removed via `RemoveDuplicateServerCss` on useEffect.
        // this also makes sure they are removed on hmr in case initial rendering failed.
        code += /* js */ `
const ssrCss = document.querySelectorAll("link[rel='stylesheet']");
import.meta.hot.on("vite:beforeUpdate", () => {
  ssrCss.forEach(node => {
    if (node.dataset.precedence?.startsWith("vite-rsc/")) {
      node.remove();
    }
  });
});
`
        // close error overlay after syntax error is fixed and hmr is triggered.
        // https://github.com/vitejs/vite/blob/8033e5bf8d3ff43995d0620490ed8739c59171dd/packages/vite/src/client/client.ts#L318-L320
        code += `
import.meta.hot.on("rsc:update", () => {
  document.querySelectorAll("vite-error-overlay").forEach((n) => n.close())
});
`
        return code
      },
    ),
    ...vitePluginRscMinimal(rscPluginOptions, manager),
    ...vitePluginFindSourceMapURL(),
    ...vitePluginRscCss(rscPluginOptions, manager),
    ...(rscPluginOptions.validateImports !== false
      ? [validateImportPlugin()]
      : []),
    ...cjsModuleRunnerPlugin(),
    ...globalAsyncLocalStoragePlugin(),
  ]
}

// make `AsyncLocalStorage` available globally for React edge build (required for React.cache, ssr preload, etc.)
// https://github.com/facebook/react/blob/f14d7f0d2597ea25da12bcf97772e8803f2a394c/packages/react-server/src/forks/ReactFlightServerConfig.dom-edge.js#L16-L19
function globalAsyncLocalStoragePlugin(): Plugin[] {
  return [
    {
      name: 'rsc:inject-async-local-storage',
      transform: {
        handler(code) {
          if (
            (this.environment.name === 'ssr' ||
              this.environment.name === 'rsc') &&
            code.includes('typeof AsyncLocalStorage') &&
            code.includes('new AsyncLocalStorage()') &&
            !code.includes('__viteRscAsyncHooks')
          ) {
            // for build, we cannot use `import` as it confuses rollup commonjs plugin.
            return (
              (this.environment.mode === 'build' && !isRolldownVite
                ? `const __viteRscAsyncHooks = require("node:async_hooks");`
                : `import * as __viteRscAsyncHooks from "node:async_hooks";`) +
              `globalThis.AsyncLocalStorage = __viteRscAsyncHooks.AsyncLocalStorage;` +
              code
            )
          }
        },
      },
    },
  ]
}

function vitePluginUseClient(
  useClientPluginOptions: Pick<
    RscPluginOptions,
    'keepUseCientProxy' | 'environment' | 'clientChunks'
  >,
  manager: RscPluginManager,
): Plugin[] {
  const packageSources = new Map<string, string>()

  // https://github.com/vitejs/vite/blob/4bcf45863b5f46aa2b41f261283d08f12d3e8675/packages/vite/src/node/utils.ts#L175
  const bareImportRE = /^(?![a-zA-Z]:)[\w@](?!.*:\/\/)/

  const serverEnvironmentName = useClientPluginOptions.environment?.rsc ?? 'rsc'
  const browserEnvironmentName =
    useClientPluginOptions.environment?.browser ?? 'client'

  let optimizerMetadata: CustomOptimizerMetadata | undefined

  // TODO: warning for late optimizer discovery
  function warnInoncistentClientOptimization(
    ctx: Rollup.TransformPluginContext,
    id: string,
  ) {
    // path in metafile is relative to cwd
    // https://github.com/vitejs/vite/blob/dd96c2cd831ecba3874458b318ad4f0a7f173736/packages/vite/src/node/optimizer/index.ts#L644
    id = normalizePath(path.relative(process.cwd(), id))
    if (optimizerMetadata?.ids.includes(id)) {
      ctx.warn(
        `client component dependency is inconsistently optimized. ` +
          `It's recommended to add the dependency to 'optimizeDeps.exclude'.`,
      )
    }
  }

  const debug = createDebug('vite-rsc:use-client')

  return [
    {
      name: 'rsc:use-client',
      async transform(code, id) {
        if (this.environment.name !== serverEnvironmentName) return
        if (!code.includes('use client')) {
          delete manager.clientReferenceMetaMap[id]
          return
        }

        const ast = await parseAstAsync(code)
        if (!hasDirective(ast.body, 'use client')) {
          delete manager.clientReferenceMetaMap[id]
          return
        }

        let importId: string
        let referenceKey: string
        const packageSource = packageSources.get(id)
        if (
          !packageSource &&
          this.environment.mode === 'dev' &&
          id.includes('/node_modules/')
        ) {
          // If non package source reached here (often with ?v=... query), this is a client boundary
          // created by a package imported on server environment, which breaks the
          // expectation on dependency optimizer on browser. Directly copying over
          // "?v=<hash>" from client optimizer in client reference can make a hashed
          // module stale, so we use another virtual module wrapper to delay such process.
          debug(
            `internal client reference created through a package imported in '${this.environment.name}' environment: ${id}`,
          )
          id = cleanUrl(id)
          warnInoncistentClientOptimization(this, id)
          importId = `/@id/__x00__virtual:vite-rsc/client-in-server-package-proxy/${encodeURIComponent(id)}`
          referenceKey = importId
        } else if (packageSource) {
          if (this.environment.mode === 'dev') {
            importId = `/@id/__x00__virtual:vite-rsc/client-package-proxy/${packageSource}`
            referenceKey = importId
          } else {
            importId = packageSource
            referenceKey = hashString(packageSource)
          }
        } else {
          if (this.environment.mode === 'dev') {
            importId = normalizeViteImportAnalysisUrl(
              manager.server.environments[browserEnvironmentName]!,
              id,
            )
            referenceKey = importId
          } else {
            importId = id
            referenceKey = hashString(manager.toRelativeId(id))
          }
        }

        const transformDirectiveProxyExport_ = withRollupError(
          this,
          transformDirectiveProxyExport,
        )
        const result = transformDirectiveProxyExport_(ast, {
          directive: 'use client',
          code,
          keep: !!useClientPluginOptions.keepUseCientProxy,
          runtime: (name, meta) => {
            let proxyValue =
              `() => { throw new Error("Unexpectedly client reference export '" + ` +
              JSON.stringify(name) +
              ` + "' is called on server") }`
            if (meta?.value) {
              proxyValue = `(${meta.value})`
            }
            return (
              `$$ReactServer.registerClientReference(` +
              `  ${proxyValue},` +
              `  ${JSON.stringify(referenceKey)},` +
              `  ${JSON.stringify(name)})`
            )
          },
        })
        if (!result) return
        const { output, exportNames } = result
        manager.clientReferenceMetaMap[id] = {
          importId,
          referenceKey,
          packageSource,
          exportNames,
          renderedExports: [],
        }
        const importSource = resolvePackage(`${PKG_NAME}/react/rsc`)
        output.prepend(`import * as $$ReactServer from "${importSource}";\n`)
        return { code: output.toString(), map: { mappings: '' } }
      },
    },
    {
      name: 'rsc:use-client/build-references',
      resolveId(source) {
        if (source.startsWith('virtual:vite-rsc/client-references')) {
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc/client-references') {
          // not used during dev
          if (this.environment.mode === 'dev') {
            return { code: `export default {}`, map: null }
          }
          // no custom chunking needed for scan
          if (manager.isScanBuild) {
            let code = ``
            for (const meta of Object.values(manager.clientReferenceMetaMap)) {
              code += `import ${JSON.stringify(meta.importId)};\n`
            }
            return { code, map: null }
          }
          let code = ''
          // group client reference modules by `clientChunks` option
          manager.clientReferenceGroups = {}
          for (const meta of Object.values(manager.clientReferenceMetaMap)) {
            let name =
              useClientPluginOptions.clientChunks?.({
                id: meta.importId,
                normalizedId: manager.toRelativeId(meta.importId),
                serverChunk: meta.serverChunk!,
              }) ?? meta.serverChunk!
            // ensure clean virtual id to avoid interfering with other plugins
            name = cleanUrl(name.replaceAll('..', '__'))
            const group = (manager.clientReferenceGroups[name] ??= [])
            group.push(meta)
            meta.groupChunkId = `\0virtual:vite-rsc/client-references/group/${name}`
          }
          debug('client-reference-groups', manager.clientReferenceGroups)
          for (const [name, metas] of Object.entries(
            manager.clientReferenceGroups,
          )) {
            const groupVirtual = `virtual:vite-rsc/client-references/group/${name}`
            for (const meta of metas) {
              code += `\
                ${JSON.stringify(meta.referenceKey)}: async () => {
                  const m = await import(${JSON.stringify(groupVirtual)});
                  return m.export_${meta.referenceKey};
                },
              `
            }
          }
          code = `export default {${code}};\n`
          return { code, map: null }
        }
        // re-export client reference modules from each group
        if (id.startsWith('\0virtual:vite-rsc/client-references/group/')) {
          const name = id.slice(
            '\0virtual:vite-rsc/client-references/group/'.length,
          )
          const metas = manager.clientReferenceGroups[name]
          assert(metas, `unknown client reference group: ${name}`)
          let code = ``
          for (const meta of metas) {
            // pick only renderedExports to tree-shake unused client references
            const exports = meta.renderedExports
              .map((name) => `${name}: import_${meta.referenceKey}.${name},\n`)
              .sort()
              .join('')
            code += `
              import * as import_${meta.referenceKey} from ${JSON.stringify(meta.importId)};
              export const export_${meta.referenceKey} = {${exports}};
            `
          }
          return { code, map: null }
        }
      },
    },
    {
      name: 'rsc:virtual-client-in-server-package',
      async load(id) {
        if (
          id.startsWith('\0virtual:vite-rsc/client-in-server-package-proxy/')
        ) {
          assert.equal(this.environment.mode, 'dev')
          assert(this.environment.name !== serverEnvironmentName)
          id = decodeURIComponent(
            id.slice(
              '\0virtual:vite-rsc/client-in-server-package-proxy/'.length,
            ),
          )
          // TODO: avoid `export default undefined`
          return `
            export * from ${JSON.stringify(id)};
            import * as __all__ from ${JSON.stringify(id)};
            export default __all__.default;
          `
        }
      },
    },
    {
      name: 'rsc:virtual-client-package',
      resolveId: {
        order: 'pre',
        async handler(source, importer, options) {
          if (
            this.environment.name === serverEnvironmentName &&
            bareImportRE.test(source)
          ) {
            const resolved = await this.resolve(source, importer, options)
            if (resolved && resolved.id.includes('/node_modules/')) {
              packageSources.set(resolved.id, source)
              return resolved
            }
          }
        },
      },
      async load(id) {
        if (id.startsWith('\0virtual:vite-rsc/client-package-proxy/')) {
          assert(this.environment.mode === 'dev')
          const source = id.slice(
            '\0virtual:vite-rsc/client-package-proxy/'.length,
          )
          const meta = Object.values(manager.clientReferenceMetaMap).find(
            (v) => v.packageSource === source,
          )!
          const exportNames = meta.exportNames
          return `export {${exportNames.join(',')}} from ${JSON.stringify(
            source,
          )};\n`
        }
      },
      generateBundle(_options, bundle) {
        if (this.environment.name !== serverEnvironmentName) return

        // analyze rsc build to inform later client reference building.
        // - track used client reference exports to tree-shake unused ones
        // - generate associated server chunk name by grouping client references

        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk') {
            const metas: [string, ClientReferenceMeta][] = []
            for (const id of chunk.moduleIds) {
              const meta = manager.clientReferenceMetaMap[id]
              if (meta) {
                metas.push([id, meta])
              }
            }
            if (metas.length > 0) {
              // this name is used for client reference group virtual chunk name,
              // which should have a stable and understandle name.
              let serverChunk: string
              if (chunk.facadeModuleId) {
                serverChunk =
                  'facade:' + manager.toRelativeId(chunk.facadeModuleId)
              } else {
                serverChunk =
                  'shared:' +
                  manager.toRelativeId(metas.map(([id]) => id).sort()[0]!)
              }
              for (const [id, meta] of metas) {
                const mod = chunk.modules[id]
                assert(mod)
                meta.renderedExports = mod.renderedExports
                meta.serverChunk = serverChunk
              }
            }
          }
        }
      },
    },
    ...customOptimizerMetadataPlugin({
      setMetadata: (metadata) => {
        optimizerMetadata = metadata
      },
    }),
  ]
}

type CustomOptimizerMetadata = {
  ids: string[]
}

function customOptimizerMetadataPlugin({
  setMetadata,
}: {
  setMetadata: (metadata: CustomOptimizerMetadata) => void
}): Plugin[] {
  const MEATADATA_FILE = '_metadata-rsc.json'

  type EsbuildPlugin = NonNullable<
    NonNullable<ResolvedConfig['optimizeDeps']['esbuildOptions']>['plugins']
  >[number]

  function optimizerPluginEsbuild(): EsbuildPlugin {
    return {
      name: 'vite-rsc-metafile',
      setup(build) {
        build.onEnd((result) => {
          // skip scan
          if (!result.metafile?.inputs || !build.initialOptions.outdir) return

          const ids = Object.keys(result.metafile.inputs)
          const metadata: CustomOptimizerMetadata = { ids }
          setMetadata(metadata)
          fs.writeFileSync(
            path.join(build.initialOptions.outdir, MEATADATA_FILE),
            JSON.stringify(metadata, null, 2),
          )
        })
      },
    }
  }

  function optimizerPluginRolldown(): Rollup.Plugin {
    return {
      name: 'vite-rsc-metafile',
      writeBundle(options) {
        assert(options.dir)
        const ids = [...this.getModuleIds()].map((id) =>
          path.relative(process.cwd(), id),
        )
        const metadata: CustomOptimizerMetadata = { ids }
        setMetadata(metadata)
        fs.writeFileSync(
          path.join(options.dir!, MEATADATA_FILE),
          JSON.stringify(metadata, null, 2),
        )
      },
    }
  }

  return [
    {
      name: 'rsc:use-client:optimizer-metadata',
      apply: 'serve',
      config() {
        return {
          environments: {
            client: {
              optimizeDeps:
                'rolldownVersion' in vite
                  ? ({
                      rolldownOptions: {
                        plugins: [optimizerPluginRolldown()],
                      },
                    } as any)
                  : {
                      esbuildOptions: {
                        plugins: [optimizerPluginEsbuild()],
                      },
                    },
            },
          },
        }
      },
      configResolved(config) {
        // https://github.com/vitejs/vite/blob/84079a84ad94de4c1ef4f1bdb2ab448ff2c01196/packages/vite/src/node/optimizer/index.ts#L941
        const file = path.join(config.cacheDir, 'deps', MEATADATA_FILE)
        if (fs.existsSync(file)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(file, 'utf-8'))
            setMetadata(metadata)
          } catch (e) {
            this.warn(`failed to load '${file}'`)
          }
        }
      },
    },
  ]
}

function vitePluginDefineEncryptionKey(
  useServerPluginOptions: Pick<
    RscPluginOptions,
    'defineEncryptionKey' | 'environment'
  >,
): Plugin[] {
  let defineEncryptionKey: string
  let emitEncryptionKey = false
  const KEY_PLACEHOLDER = '__vite_rsc_define_encryption_key'
  const KEY_FILE = '__vite_rsc_encryption_key.js'

  const serverEnvironmentName = useServerPluginOptions.environment?.rsc ?? 'rsc'

  return [
    {
      name: 'rsc:encryption-key',
      async configEnvironment(name, _config, env) {
        if (name === serverEnvironmentName && !env.isPreview) {
          defineEncryptionKey =
            useServerPluginOptions.defineEncryptionKey ??
            JSON.stringify(toBase64(await generateEncryptionKey()))
        }
      },
      resolveId(source) {
        if (source === 'virtual:vite-rsc/encryption-key') {
          // encryption logic can be tree-shaken if action bind is not used.
          return { id: '\0' + source, moduleSideEffects: false }
        }
      },
      load(id) {
        if (id === '\0virtual:vite-rsc/encryption-key') {
          if (this.environment.mode === 'build') {
            // during build, load key from an external file to make chunks stable.
            return `export default () => ${KEY_PLACEHOLDER}`
          }
          return `export default () => (${defineEncryptionKey})`
        }
      },
      renderChunk(code, chunk) {
        if (code.includes(KEY_PLACEHOLDER)) {
          assert.equal(this.environment.name, 'rsc')
          emitEncryptionKey = true
          const normalizedPath = normalizeRelativePath(
            path.relative(path.join(chunk.fileName, '..'), KEY_FILE),
          )
          const replacement = `import(${JSON.stringify(
            normalizedPath,
          )}).then(__m => __m.default)`
          code = code.replaceAll(KEY_PLACEHOLDER, () => replacement)
          return { code }
        }
      },
      writeBundle() {
        if (this.environment.name === 'rsc' && emitEncryptionKey) {
          fs.writeFileSync(
            path.join(this.environment.config.build.outDir, KEY_FILE),
            `export default ${defineEncryptionKey};\n`,
          )
        }
      },
    },
  ]
}

function vitePluginUseServer(
  useServerPluginOptions: Pick<
    RscPluginOptions,
    'enableActionEncryption' | 'environment'
  >,
  manager: RscPluginManager,
): Plugin[] {
  const serverEnvironmentName = useServerPluginOptions.environment?.rsc ?? 'rsc'
  const browserEnvironmentName =
    useServerPluginOptions.environment?.browser ?? 'client'

  const debug = createDebug('vite-rsc:use-server')

  return [
    {
      name: 'rsc:use-server',
      async transform(code, id) {
        if (!code.includes('use server')) {
          delete manager.serverReferenceMetaMap[id]
          return
        }
        const ast = await parseAstAsync(code)

        let normalizedId_: string | undefined
        const getNormalizedId = () => {
          if (!normalizedId_) {
            if (
              this.environment.mode === 'dev' &&
              id.includes('/node_modules/')
            ) {
              // similar situation as `use client` (see `virtual:client-in-server-package-proxy`)
              // but module runner has additional resolution step and it's not strict about
              // module identity of `import(id)` like browser, so we simply strip queries such as `?v=`.
              debug(
                `internal server reference created through a package imported in ${this.environment.name} environment: ${id}`,
              )
              id = cleanUrl(id)
            }
            if (manager.config.command === 'build') {
              normalizedId_ = hashString(manager.toRelativeId(id))
            } else {
              normalizedId_ = normalizeViteImportAnalysisUrl(
                manager.server.environments[serverEnvironmentName]!,
                id,
              )
            }
          }
          return normalizedId_
        }

        if (this.environment.name === serverEnvironmentName) {
          const transformServerActionServer_ = withRollupError(
            this,
            transformServerActionServer,
          )
          const enableEncryption =
            useServerPluginOptions.enableActionEncryption ?? true
          const result = transformServerActionServer_(code, ast, {
            runtime: (value, name) =>
              `$$ReactServer.registerServerReference(${value}, ${JSON.stringify(
                getNormalizedId(),
              )}, ${JSON.stringify(name)})`,
            rejectNonAsyncFunction: true,
            encode: enableEncryption
              ? (value) =>
                  `__vite_rsc_encryption_runtime.encryptActionBoundArgs(${value})`
              : undefined,
            decode: enableEncryption
              ? (value) =>
                  `await __vite_rsc_encryption_runtime.decryptActionBoundArgs(${value})`
              : undefined,
          })
          const output = result.output
          if (!result || !output.hasChanged()) {
            delete manager.serverReferenceMetaMap[id]
            return
          }
          manager.serverReferenceMetaMap[id] = {
            importId: id,
            referenceKey: getNormalizedId(),
            exportNames: 'names' in result ? result.names : result.exportNames,
          }
          const importSource = resolvePackage(`${PKG_NAME}/react/rsc`)
          output.prepend(`import * as $$ReactServer from "${importSource}";\n`)
          if (enableEncryption) {
            const importSource = resolvePackage(
              `${PKG_NAME}/utils/encryption-runtime`,
            )
            output.prepend(
              `import * as __vite_rsc_encryption_runtime from ${JSON.stringify(importSource)};\n`,
            )
          }
          return {
            code: output.toString(),
            map: output.generateMap({ hires: 'boundary' }),
          }
        } else {
          if (!hasDirective(ast.body, 'use server')) {
            delete manager.serverReferenceMetaMap[id]
            return
          }
          const transformDirectiveProxyExport_ = withRollupError(
            this,
            transformDirectiveProxyExport,
          )
          const result = transformDirectiveProxyExport_(ast, {
            code,
            runtime: (name) =>
              `$$ReactClient.createServerReference(` +
              `${JSON.stringify(getNormalizedId() + '#' + name)},` +
              `$$ReactClient.callServer, ` +
              `undefined, ` +
              (this.environment.mode === 'dev'
                ? `$$ReactClient.findSourceMapURL,`
                : 'undefined,') +
              `${JSON.stringify(name)})`,
            directive: 'use server',
            rejectNonAsyncFunction: true,
          })
          if (!result) return
          const output = result?.output
          if (!output?.hasChanged()) return
          manager.serverReferenceMetaMap[id] = {
            importId: id,
            referenceKey: getNormalizedId(),
            exportNames: result.exportNames,
          }
          const name =
            this.environment.name === browserEnvironmentName ? 'browser' : 'ssr'
          const importSource = resolvePackage(`${PKG_NAME}/react/${name}`)
          output.prepend(`import * as $$ReactClient from "${importSource}";\n`)
          return {
            code: output.toString(),
            map: output.generateMap({ hires: 'boundary' }),
          }
        }
      },
    },
    createVirtualPlugin('vite-rsc/server-references', function () {
      if (this.environment.mode === 'dev') {
        return { code: `export {}`, map: null }
      }
      let code = ''
      for (const meta of Object.values(manager.serverReferenceMetaMap)) {
        const key = JSON.stringify(meta.referenceKey)
        const id = JSON.stringify(meta.importId)
        const exports = meta.exportNames
          .map((name) => (name === 'default' ? 'default: _default' : name))
          .sort()
        code += `
  ${key}: async () => {
    const {${exports}} = await import(${id});
    return {${exports}};
  },
`
      }
      code = `export default {${code}};\n`
      return { code, map: null }
    }),
  ]
}

class RuntimeAsset {
  runtime: string
  constructor(value: string) {
    this.runtime = value
  }
}

function serializeValueWithRuntime(value: any) {
  const replacements: [string, string][] = []
  let result = JSON.stringify(
    value,
    (_key, value) => {
      if (value instanceof RuntimeAsset) {
        const placeholder = `__runtime_placeholder_${replacements.length}__`
        replacements.push([placeholder, value.runtime])
        return placeholder
      }

      return value
    },
    2,
  )

  for (const [placeholder, runtime] of replacements) {
    result = result.replace(`"${placeholder}"`, runtime)
  }

  return result
}

function assetsURL(url: string, manager: RscPluginManager) {
  const { config } = manager
  if (
    config.command === 'build' &&
    typeof config.experimental?.renderBuiltUrl === 'function'
  ) {
    // https://github.com/vitejs/vite/blob/bdde0f9e5077ca1a21a04eefc30abad055047226/packages/vite/src/node/build.ts#L1369
    const result = config.experimental.renderBuiltUrl(url, {
      type: 'asset',
      hostType: 'js',
      ssr: true,
      hostId: '',
    })

    if (typeof result === 'object') {
      if (result.runtime) {
        return new RuntimeAsset(result.runtime)
      }
      assert(
        !result.relative,
        '"result.relative" not supported on renderBuiltUrl() for RSC',
      )
    } else if (result) {
      return result satisfies string
    }
  }

  // https://github.com/vitejs/vite/blob/2a7473cfed96237711cda9f736465c84d442ddef/packages/vite/src/node/plugins/importAnalysisBuild.ts#L222-L230
  return config.base + url
}

function assetsURLOfDeps(deps: AssetDeps, manager: RscPluginManager) {
  return {
    js: deps.js.map((href) => {
      assert(typeof href === 'string')
      return assetsURL(href, manager)
    }),
    css: deps.css.map((href) => {
      assert(typeof href === 'string')
      return assetsURL(href, manager)
    }),
  }
}

//
// collect client reference dependency chunk for modulepreload
//

export type AssetsManifest = {
  bootstrapScriptContent: string | RuntimeAsset
  clientReferenceDeps: Record<string, AssetDeps>
  serverResources?: Record<string, Pick<AssetDeps, 'css'>>
}

export type AssetDeps = {
  js: (string | RuntimeAsset)[]
  css: (string | RuntimeAsset)[]
}

export type ResolvedAssetsManifest = {
  bootstrapScriptContent: string
  clientReferenceDeps: Record<string, ResolvedAssetDeps>
  serverResources?: Record<string, Pick<ResolvedAssetDeps, 'css'>>
}

export type ResolvedAssetDeps = {
  js: string[]
  css: string[]
}

function mergeAssetDeps(a: AssetDeps, b: AssetDeps): AssetDeps {
  return {
    js: [...new Set([...a.js, ...b.js])],
    css: [...new Set([...a.css, ...b.css])],
  }
}

function collectAssetDeps(bundle: Rollup.OutputBundle) {
  const chunkToDeps = new Map<Rollup.OutputChunk, ResolvedAssetDeps>()
  for (const chunk of Object.values(bundle)) {
    if (chunk.type === 'chunk') {
      chunkToDeps.set(chunk, collectAssetDepsInner(chunk.fileName, bundle))
    }
  }
  const idToDeps: Record<
    string,
    { chunk: Rollup.OutputChunk; deps: ResolvedAssetDeps }
  > = {}
  for (const [chunk, deps] of chunkToDeps.entries()) {
    for (const id of chunk.moduleIds) {
      idToDeps[id] = { chunk, deps }
    }
  }
  return idToDeps
}

function collectAssetDepsInner(
  fileName: string,
  bundle: Rollup.OutputBundle,
): ResolvedAssetDeps {
  const visited = new Set<string>()
  const css: string[] = []

  function recurse(k: string) {
    if (visited.has(k)) return
    visited.add(k)
    const v = bundle[k]
    assert(v, `Not found '${k}' in the bundle`)
    if (v.type === 'chunk') {
      css.push(...(v.viteMetadata?.importedCss ?? []))
      for (const k2 of v.imports) {
        // server external imports is not in bundle
        if (k2 in bundle) {
          recurse(k2)
        }
      }
    }
  }

  recurse(fileName)
  return {
    js: [...visited],
    css: [...new Set(css)],
  }
}

//
// css support
//

function vitePluginRscCss(
  rscCssOptions: Pick<RscPluginOptions, 'rscCssTransform'> = {},
  manager: RscPluginManager,
): Plugin[] {
  function hasSpecialCssQuery(id: string): boolean {
    return /[?&](url|inline|raw)(\b|=|&|$)/.test(id)
  }

  function collectCss(environment: DevEnvironment, entryId: string) {
    const visited = new Set<string>()
    const cssIds = new Set<string>()
    const visitedFiles = new Set<string>()

    function recurse(id: string) {
      if (visited.has(id)) {
        return
      }
      visited.add(id)
      const mod = environment.moduleGraph.getModuleById(id)
      if (mod?.file) {
        visitedFiles.add(mod.file)
      }
      for (const next of mod?.importedModules ?? []) {
        if (next.id) {
          if (isCSSRequest(next.id)) {
            if (hasSpecialCssQuery(next.id)) {
              continue
            }
            cssIds.add(next.id)
          } else {
            recurse(next.id)
          }
        }
      }
    }

    recurse(entryId)

    // this doesn't include ?t= query so that RSC <link /> won't keep adding styles.
    const hrefs = [...cssIds].map((id) =>
      normalizeViteImportAnalysisUrl(environment, id),
    )
    return { ids: [...cssIds], hrefs, visitedFiles: [...visitedFiles] }
  }

  function getRscCssTransformFilter({
    id,
    code,
  }: {
    id: string
    code: string
  }): false | TransformWrapExportFilter {
    const { filename, query } = parseIdQuery(id)
    if ('vite-rsc-css-export' in query) {
      const value = query['vite-rsc-css-export']
      if (value) {
        const names = value.split(',')
        return (name: string) => names.includes(name)
      }
      return (name: string) => /^[A-Z]/.test(name)
    }

    const options = rscCssOptions?.rscCssTransform
    if (options === false) return false
    if (options?.filter && !options.filter(filename)) return false
    // https://github.com/vitejs/vite/blob/7979f9da555aa16bd221b32ea78ce8cb5292fac4/packages/vite/src/node/constants.ts#L95
    if (
      !/\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)\b/.test(code) ||
      !/\.[tj]sx?$/.test(filename)
    )
      return false

    // skip transform if no css imports
    const result = esModuleLexer.parse(code)
    if (!result[0].some((i) => i.t === 1 && i.n && isCSSRequest(i.n))) {
      return false
    }
    // transform only function exports with capital names, e.g.
    //   export default function Page() {}
    //   export function Page() {}
    //   export const Page = () => {}
    return (_name: string, meta) =>
      !!(
        (meta.isFunction && meta.declName && /^[A-Z]/.test(meta.declName)) ||
        (meta.defaultExportIdentifierName &&
          /^[A-Z]/.test(meta.defaultExportIdentifierName))
      )
  }

  return [
    {
      name: 'rsc:rsc-css-export-transform',
      async transform(code, id) {
        if (this.environment.name !== 'rsc') return
        const filter = getRscCssTransformFilter({ id, code })
        if (!filter) return
        const ast = await parseAstAsync(code)
        const result = await transformRscCssExport({
          ast,
          code,
          filter,
        })
        if (result) {
          return {
            code: result.output.toString(),
            map: result.output.generateMap({ hires: 'boundary' }),
          }
        }
      },
    },
    {
      name: 'rsc:css-virtual',
      resolveId(source) {
        if (source.startsWith('virtual:vite-rsc/css?')) {
          return '\0' + source
        }
      },
      async load(id) {
        const parsed = parseCssVirtual(id)
        if (parsed?.type === 'ssr') {
          id = parsed.id
          const { server } = manager
          const mod =
            await server.environments.ssr.moduleGraph.getModuleByUrl(id)
          if (!mod?.id || !mod?.file) {
            return `export default []`
          }
          const result = collectCss(server.environments.ssr, mod.id)
          // invalidate virtual module on js file changes to reflect added/deleted css import
          for (const file of [mod.file, ...result.visitedFiles]) {
            this.addWatchFile(file)
          }
          const hrefs = result.hrefs.map((href) =>
            assetsURL(href.slice(1), manager),
          )
          return `export default ${serializeValueWithRuntime(hrefs)}`
        }
      },
    },
    {
      name: 'rsc:importer-resources',
      async transform(code, id) {
        if (!code.includes('import.meta.viteRsc.loadCss')) return

        assert(this.environment.name === 'rsc')
        const output = new MagicString(code)
        let importAdded = false

        for (const match of code.matchAll(
          /import\.meta\.viteRsc\.loadCss\(([\s\S]*?)\)/dg,
        )) {
          const [start, end] = match.indices![0]!
          const argCode = match[1]!.trim()
          let importer = id
          if (argCode) {
            const argValue = evalValue<string>(argCode)
            const resolved = await this.resolve(argValue, id)
            if (resolved) {
              importer = resolved.id
            } else {
              this.warn(
                `[vite-rsc] failed to transform 'import.meta.viteRsc.loadCss(${argCode})'`,
              )
              output.update(start, end, `null`)
              continue
            }
          }

          const importId = toCssVirtual({ id: importer, type: 'rsc' })

          // use dynamic import during dev to delay crawling and discover css correctly.
          let replacement: string
          if (this.environment.mode === 'dev') {
            replacement = `__vite_rsc_react__.createElement(async () => {
              const __m = await import(${JSON.stringify(importId)});
              return __vite_rsc_react__.createElement(__m.Resources);
            })`
          } else {
            const hash = hashString(importId)
            if (
              !importAdded &&
              !code.includes(`__vite_rsc_importer_resources_${hash}`)
            ) {
              importAdded = true
              output.prepend(
                `import * as __vite_rsc_importer_resources_${hash} from ${JSON.stringify(
                  importId,
                )};`,
              )
            }
            replacement = `__vite_rsc_react__.createElement(__vite_rsc_importer_resources_${hash}.Resources)`
          }
          output.update(start, end, replacement)
        }

        if (output.hasChanged()) {
          if (!code.includes('__vite_rsc_react__')) {
            output.prepend(`import __vite_rsc_react__ from "react";`)
          }
          return {
            code: output.toString(),
            map: output.generateMap({ hires: 'boundary' }),
          }
        }
      },
      load(id) {
        const { server } = manager
        const parsed = parseCssVirtual(id)
        if (parsed?.type === 'rsc') {
          assert(this.environment.name === 'rsc')
          const importer = parsed.id
          if (this.environment.mode === 'dev') {
            const result = collectCss(server.environments.rsc!, importer)
            const cssHrefs = result.hrefs.map((href) => href.slice(1))
            const jsHrefs = [
              `@id/__x00__${toCssVirtual({ id: importer, type: 'rsc-browser' })}`,
            ]
            const deps = assetsURLOfDeps(
              { css: cssHrefs, js: jsHrefs },
              manager,
            )
            return generateResourcesCode(
              serializeValueWithRuntime(deps),
              manager,
            )
          } else {
            const key = manager.toRelativeId(importer)
            manager.serverResourcesMetaMap[importer] = { key }
            return `
              import __vite_rsc_assets_manifest__ from "virtual:vite-rsc/assets-manifest";
              ${generateResourcesCode(
                `__vite_rsc_assets_manifest__.serverResources[${JSON.stringify(
                  key,
                )}]`,
                manager,
              )}
            `
          }
        }
        if (parsed?.type === 'rsc-browser') {
          assert(this.environment.name === 'client')
          assert(this.environment.mode === 'dev')
          const importer = parsed.id
          const result = collectCss(server.environments.rsc!, importer)
          let code = result.ids
            .map((id) => id.replace(/^\0/, ''))
            .map((id) => `import ${JSON.stringify(id)};\n`)
            .join('')
          // ensure hmr boundary at this virtual since otherwise non-self accepting css
          // (e.g. css module) causes full reload
          code += `if (import.meta.hot) { import.meta.hot.accept() }\n`
          return code
        }
      },
      hotUpdate(ctx) {
        if (this.environment.name === 'rsc') {
          const { server } = manager
          const mods = collectModuleDependents(ctx.modules)
          for (const mod of mods) {
            if (mod.id) {
              invalidteModuleById(
                server.environments.rsc!,
                `\0` + toCssVirtual({ id: mod.id, type: 'rsc' }),
              )
              invalidteModuleById(
                server.environments.client,
                `\0` + toCssVirtual({ id: mod.id, type: 'rsc-browser' }),
              )
            }
          }
        }
      },
    },
    createVirtualPlugin(
      'vite-rsc/remove-duplicate-server-css',
      async function () {
        // Remove duplicate css during dev due to server rendered <link> and client inline <style>
        // https://github.com/remix-run/react-router/blob/166fd940e7d5df9ed005ca68e12de53b1d88324a/packages/react-router/lib/dom-export/hydrated-router.tsx#L245-L274
        assert.equal(this.environment.mode, 'dev')
        function removeFn() {
          document
            .querySelectorAll("link[rel='stylesheet']")
            .forEach((node) => {
              if (
                node instanceof HTMLElement &&
                node.dataset.precedence?.startsWith('vite-rsc/')
              ) {
                node.remove()
              }
            })
        }
        return `\
"use client"
import React from "react";
export default function RemoveDuplicateServerCss() {
  React.useEffect(() => {
    (${removeFn.toString()})();
  }, []);
  return null;
}
`
      },
    ),
  ]
}

function invalidteModuleById(environment: DevEnvironment, id: string) {
  const mod = environment.moduleGraph.getModuleById(id)
  if (mod) {
    environment.moduleGraph.invalidateModule(mod)
  }
  return mod
}

function collectModuleDependents(mods: EnvironmentModuleNode[]) {
  const visited = new Set<EnvironmentModuleNode>()
  function recurse(mod: EnvironmentModuleNode) {
    if (visited.has(mod)) return
    visited.add(mod)
    for (const importer of mod.importers) {
      recurse(importer)
    }
  }
  for (const mod of mods) {
    recurse(mod)
  }
  return [...visited]
}

function generateResourcesCode(depsCode: string, manager: RscPluginManager) {
  const ResourcesFn = (
    React: typeof import('react'),
    deps: ResolvedAssetDeps,
    RemoveDuplicateServerCss?: React.FC,
  ) => {
    return function Resources() {
      return React.createElement(React.Fragment, null, [
        ...deps.css.map((href: string) =>
          React.createElement('link', {
            key: 'css:' + href,
            rel: 'stylesheet',
            precedence: 'vite-rsc/importer-resources',
            href: href,
          }),
        ),
        // js is only for dev to forward css import on browser to have hmr
        ...deps.js.map((href: string) =>
          React.createElement('script', {
            key: 'js:' + href,
            type: 'module',
            async: true,
            src: href,
          }),
        ),
        RemoveDuplicateServerCss &&
          React.createElement(RemoveDuplicateServerCss, {
            key: 'remove-duplicate-css',
          }),
      ])
    }
  }

  return `
import __vite_rsc_react__ from "react";

${
  manager.config.command === 'serve'
    ? `import RemoveDuplicateServerCss from "virtual:vite-rsc/remove-duplicate-server-css";`
    : `const RemoveDuplicateServerCss = undefined;`
}

export const Resources = (${ResourcesFn.toString()})(
  __vite_rsc_react__,
  ${depsCode},
  RemoveDuplicateServerCss,
);
`
}

export async function transformRscCssExport(options: {
  ast: Awaited<ReturnType<typeof parseAstAsync>>
  code: string
  id?: string
  filter: TransformWrapExportFilter
}): Promise<{ output: MagicString } | undefined> {
  if (hasDirective(options.ast.body, 'use client')) {
    return
  }

  const result = transformWrapExport(options.code, options.ast, {
    runtime: (value, name, meta) =>
      `__vite_rsc_wrap_css__(${value}, ${JSON.stringify(
        meta.defaultExportIdentifierName ?? name,
      )})`,
    filter: options.filter,
    ignoreExportAllDeclaration: true,
  })
  if (result.output.hasChanged()) {
    if (!options.code.includes('__vite_rsc_react__')) {
      result.output.prepend(`import __vite_rsc_react__ from "react";`)
    }
    result.output.append(`
function __vite_rsc_wrap_css__(value, name) {
  if (typeof value !== 'function') return value;

  function __wrapper(props) {
    return __vite_rsc_react__.createElement(
      __vite_rsc_react__.Fragment,
      null,
      import.meta.viteRsc.loadCss(${
        options.id ? JSON.stringify(options.id) : ''
      }),
      __vite_rsc_react__.createElement(value, props),
    );
  }
  Object.defineProperty(__wrapper, "name", { value: name });
  return __wrapper;
}
`)
    return { output: result.output }
  }
}
