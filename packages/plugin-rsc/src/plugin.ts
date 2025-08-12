import assert from 'node:assert'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequestListener } from '@remix-run/node-fetch-server'
import * as esModuleLexer from 'es-module-lexer'
import MagicString from 'magic-string'
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
  normalizeViteImportAnalysisUrl,
  prepareError,
} from './vite-utils'
import { cjsModuleRunnerPlugin } from './plugins/cjs'
import { evalValue, parseIdQuery } from './plugins/utils'

// state for build orchestration
let serverReferences: Record<string, string> = {}
let server: ViteDevServer
let config: ResolvedConfig
let rscBundle: Rollup.OutputBundle
let buildAssetsManifest: AssetsManifest | undefined
let isScanBuild = false
const BUILD_ASSETS_MANIFEST_NAME = '__vite_rsc_assets_manifest.js'

type ClientReferenceMeta = {
  importId: string
  // same as `importId` during dev. hashed id during build.
  referenceKey: string
  packageSource?: string
  // build only for tree-shaking unused export
  exportNames: string[]
  renderedExports: string[]
}
let clientReferenceMetaMap: Record</* id */ string, ClientReferenceMeta> = {}

let serverResourcesMetaMap: Record<string, { key: string }> = {}

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
}

/** @experimental */
export function vitePluginRscMinimal(
  rscPluginOptions: RscPluginOptions = {},
): Plugin[] {
  return [
    {
      name: 'rsc:minimal',
      enforce: 'pre',
      async config() {
        await esModuleLexer.init
      },
      configResolved(config_) {
        config = config_
      },
      configureServer(server_) {
        server = server_
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
    ...vitePluginUseClient(rscPluginOptions),
    ...vitePluginUseServer(rscPluginOptions),
    ...vitePluginDefineEncryptionKey(rscPluginOptions),
  ]
}

export default function vitePluginRsc(
  rscPluginOptions: RscPluginOptions = {},
): Plugin[] {
  const buildApp: NonNullable<BuilderOptions['buildApp']> = async (builder) => {
    // no-ssr case
    // rsc -> client -> rsc -> client
    if (!builder.environments.ssr?.config.build.rollupOptions.input) {
      isScanBuild = true
      builder.environments.rsc!.config.build.write = false
      builder.environments.client!.config.build.write = false
      await builder.build(builder.environments.rsc!)
      await builder.build(builder.environments.client!)
      isScanBuild = false
      builder.environments.rsc!.config.build.write = true
      builder.environments.client!.config.build.write = true
      await builder.build(builder.environments.rsc!)
      // sort for stable build
      clientReferenceMetaMap = sortObject(clientReferenceMetaMap)
      serverResourcesMetaMap = sortObject(serverResourcesMetaMap)
      await builder.build(builder.environments.client!)
      writeAssetsManifest(['rsc'])
      return
    }

    // rsc -> ssr -> rsc -> client -> ssr
    isScanBuild = true
    builder.environments.rsc!.config.build.write = false
    builder.environments.ssr!.config.build.write = false
    await builder.build(builder.environments.rsc!)
    await builder.build(builder.environments.ssr!)
    isScanBuild = false
    builder.environments.rsc!.config.build.write = true
    builder.environments.ssr!.config.build.write = true
    await builder.build(builder.environments.rsc!)
    // sort for stable build
    clientReferenceMetaMap = sortObject(clientReferenceMetaMap)
    serverResourcesMetaMap = sortObject(serverResourcesMetaMap)
    await builder.build(builder.environments.client!)
    await builder.build(builder.environments.ssr!)
    writeAssetsManifest(['ssr', 'rsc'])
  }

  function writeAssetsManifest(environmentNames: string[]) {
    // output client manifest to non-client build directly.
    // this makes server build to be self-contained and deploy-able for cloudflare.
    const assetsManifestCode = `export default ${serializeValueWithRuntime(
      buildAssetsManifest,
    )}`
    for (const name of environmentNames) {
      const manifestPath = path.join(
        config.environments[name]!.build.outDir,
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
      configureServer() {
        ;(globalThis as any).__viteRscDevServer = server

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
          config.environments[options.environmentName]!.build.outDir,
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
            return ctx.modules.filter((m) => !m.id?.includes('?direct'))
          }
        }

        const ids = ctx.modules.map((mod) => mod.id).filter((v) => v !== null)
        if (ids.length === 0) return

        // a shared component/module will have `isInsideClientBoundary = false` on `rsc` environment
        // and `isInsideClientBoundary = true` on `client` environment,
        // which means both server hmr and client hmr will be triggered.
        function isInsideClientBoundary(mods: EnvironmentModuleNode[]) {
          const visited = new Set<string>()
          function recurse(mod: EnvironmentModuleNode): boolean {
            if (!mod.id) return false
            if (clientReferenceMetaMap[mod.id]) return true
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
                  server.environments.client.hot.send({
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
          const entryUrl = assetsURL('@id/__x00__' + VIRTUAL_ENTRIES.browser)
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
          rscBundle = bundle
        }

        if (this.environment.name === 'client') {
          const filterAssets =
            rscPluginOptions.copyServerAssetsToClient ?? (() => true)
          const rscBuildOptions = config.environments.rsc!.build
          const rscViteManifest =
            typeof rscBuildOptions.manifest === 'string'
              ? rscBuildOptions.manifest
              : rscBuildOptions.manifest && '.vite/manifest.json'
          for (const asset of Object.values(rscBundle)) {
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
          const rscAssetDeps = collectAssetDeps(rscBundle)
          for (const [id, meta] of Object.entries(serverResourcesMetaMap)) {
            serverResources[meta.key] = assetsURLOfDeps({
              js: [],
              css: rscAssetDeps[id]?.deps.css ?? [],
            })
          }

          const assetDeps = collectAssetDeps(bundle)
          const entry = Object.values(assetDeps).find(
            (v) => v.chunk.name === 'index',
          )
          assert(entry)
          const entryUrl = assetsURL(entry.chunk.fileName)
          const clientReferenceDeps: Record<string, AssetDeps> = {}
          for (const [id, meta] of Object.entries(clientReferenceMetaMap)) {
            const deps: AssetDeps = assetDeps[id]?.deps ?? { js: [], css: [] }
            clientReferenceDeps[meta.referenceKey] = assetsURLOfDeps(
              mergeAssetDeps(deps, entry.deps),
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
          buildAssetsManifest = {
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
        // TODO: this doesn't have to wait for "vite:beforeUpdate" and should do it right after browser css import.
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
    {
      // make `AsyncLocalStorage` available globally for React request context on edge build (e.g. React.cache, ssr preload)
      // https://github.com/facebook/react/blob/f14d7f0d2597ea25da12bcf97772e8803f2a394c/packages/react-server/src/forks/ReactFlightServerConfig.dom-edge.js#L16-L19
      name: 'rsc:inject-async-local-storage',
      async configureServer() {
        const __viteRscAyncHooks = await import('node:async_hooks')
        ;(globalThis as any).AsyncLocalStorage =
          __viteRscAyncHooks.AsyncLocalStorage
      },
      banner(chunk) {
        if (
          (this.environment.name === 'ssr' ||
            this.environment.name === 'rsc') &&
          this.environment.mode === 'build' &&
          chunk.isEntry
        ) {
          return `\
import * as __viteRscAyncHooks from "node:async_hooks";
globalThis.AsyncLocalStorage = __viteRscAyncHooks.AsyncLocalStorage;
`
        }
        return ''
      },
    },
    ...vitePluginRscMinimal(rscPluginOptions),
    ...vitePluginFindSourceMapURL(),
    ...vitePluginRscCss({ rscCssTransform: rscPluginOptions.rscCssTransform }),
    ...(rscPluginOptions.validateImports !== false
      ? [validateImportPlugin()]
      : []),
    scanBuildStripPlugin(),
    ...cjsModuleRunnerPlugin(),
  ]
}

function scanBuildStripPlugin(): Plugin {
  return {
    name: 'rsc:scan-strip',
    apply: 'build',
    enforce: 'post',
    transform(code, _id, _options) {
      if (!isScanBuild) return
      // During server scan, we strip all code but imports to only discover client/server references.
      const [imports] = esModuleLexer.parse(code)
      const output = imports
        .map((e) => e.n && `import ${JSON.stringify(e.n)};\n`)
        .filter(Boolean)
        .join('')
      return { code: output, map: { mappings: '' } }
    },
  }
}

function normalizeRelativePath(s: string) {
  s = normalizePath(s)
  return s[0] === '.' ? s : './' + s
}

function getEntrySource(
  config: Pick<ResolvedConfig, 'build'>,
  name: string = 'index',
) {
  const input = config.build.rollupOptions.input
  assert(
    typeof input === 'object' &&
      !Array.isArray(input) &&
      name in input &&
      typeof input[name] === 'string',
    `[vite-rsc:getEntrySource] expected 'build.rollupOptions.input' to be an object with a '${name}' property that is a string, but got ${JSON.stringify(input)}`,
  )
  return input[name]
}

function hashString(v: string) {
  return createHash('sha256').update(v).digest().toString('hex').slice(0, 12)
}

function vitePluginUseClient(
  useClientPluginOptions: Pick<
    RscPluginOptions,
    'ignoredPackageWarnings' | 'keepUseCientProxy' | 'environment'
  >,
): Plugin[] {
  const packageSources = new Map<string, string>()

  // https://github.com/vitejs/vite/blob/4bcf45863b5f46aa2b41f261283d08f12d3e8675/packages/vite/src/node/utils.ts#L175
  const bareImportRE = /^(?![a-zA-Z]:)[\w@](?!.*:\/\/)/

  const serverEnvironmentName = useClientPluginOptions.environment?.rsc ?? 'rsc'
  const browserEnvironmentName =
    useClientPluginOptions.environment?.browser ?? 'client'

  return [
    {
      name: 'rsc:use-client',
      async transform(code, id) {
        if (this.environment.name !== serverEnvironmentName) return
        if (!code.includes('use client')) return

        const ast = await parseAstAsync(code)
        if (!hasDirective(ast.body, 'use client')) return

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
          // TODO: suggest `optimizeDeps.exclude` and skip warning if that's already the case.
          const ignored = useClientPluginOptions.ignoredPackageWarnings?.some(
            (pattern) =>
              pattern instanceof RegExp
                ? pattern.test(id)
                : id.includes(`/node_modules/${pattern}/`),
          )
          if (!ignored) {
            this.warn(
              `[vite-rsc] detected an internal client boundary created by a package imported on rsc environment`,
            )
          }
          importId = `/@id/__x00__virtual:vite-rsc/client-in-server-package-proxy/${encodeURIComponent(cleanUrl(id))}`
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
              server.environments[browserEnvironmentName]!,
              id,
            )
            referenceKey = importId
          } else {
            importId = id
            referenceKey = hashString(
              normalizePath(path.relative(config.root, id)),
            )
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
        clientReferenceMetaMap[id] = {
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
    createVirtualPlugin('vite-rsc/client-references', function () {
      if (this.environment.mode === 'dev') {
        return { code: `export default {}`, map: null }
      }
      let code = ''
      for (const meta of Object.values(clientReferenceMetaMap)) {
        // vite/rollup can apply tree-shaking to dynamic import of this form
        const key = JSON.stringify(meta.referenceKey)
        const id = JSON.stringify(meta.importId)
        const exports = meta.renderedExports
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
          const meta = Object.values(clientReferenceMetaMap).find(
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

        // track used exports of client references in rsc build
        // to tree shake unused exports in browser and ssr build
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk') {
            for (const [id, mod] of Object.entries(chunk.modules)) {
              const meta = clientReferenceMetaMap[id]
              if (meta) {
                meta.renderedExports = mod.renderedExports
              }
            }
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
    'ignoredPackageWarnings' | 'enableActionEncryption' | 'environment'
  >,
): Plugin[] {
  const serverEnvironmentName = useServerPluginOptions.environment?.rsc ?? 'rsc'
  const browserEnvironmentName =
    useServerPluginOptions.environment?.browser ?? 'client'

  return [
    {
      name: 'rsc:use-server',
      async transform(code, id) {
        if (!code.includes('use server')) return
        const ast = await parseAstAsync(code)

        let normalizedId_: string | undefined
        const getNormalizedId = () => {
          if (!normalizedId_) {
            if (
              this.environment.mode === 'dev' &&
              id.includes('/node_modules/')
            ) {
              const ignored =
                useServerPluginOptions.ignoredPackageWarnings?.some(
                  (pattern) =>
                    pattern instanceof RegExp
                      ? pattern.test(id)
                      : id.includes(`/node_modules/${pattern}/`),
                )
              if (!ignored) {
                this.warn(
                  `[vite-rsc] detected an internal server function created by a package imported on ${this.environment.name} environment`,
                )
              }
              // module runner has additional resolution step and it's not strict about
              // module identity of `import(id)` like browser, so we simply strip queries such as `?v=`.
              id = cleanUrl(id)
            }
            if (config.command === 'build') {
              normalizedId_ = hashString(path.relative(config.root, id))
            } else {
              normalizedId_ = normalizeViteImportAnalysisUrl(
                server.environments[serverEnvironmentName]!,
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
          const { output } = transformServerActionServer_(code, ast, {
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
          if (!output.hasChanged()) return
          serverReferences[getNormalizedId()] = id
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
          if (!hasDirective(ast.body, 'use server')) return
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
          const output = result?.output
          if (!output?.hasChanged()) return
          serverReferences[getNormalizedId()] = id
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
      const code = generateDynamicImportCode(serverReferences)
      return { code, map: null }
    }),
  ]
}

// Rethrow transform error through `this.error` with `error.pos` which is injected by `@hiogawa/transforms`
function withRollupError<F extends (...args: any[]) => any>(
  ctx: Rollup.TransformPluginContext,
  f: F,
): F {
  function processError(e: any): never {
    if (e && typeof e === 'object' && typeof e.pos === 'number') {
      return ctx.error(e, e.pos)
    }
    throw e
  }
  return function (this: any, ...args: any[]) {
    try {
      const result = f.apply(this, args)
      if (result instanceof Promise) {
        return result.catch((e: any) => processError(e))
      }
      return result
    } catch (e: any) {
      processError(e)
    }
  } as F
}

function createVirtualPlugin(name: string, load: Plugin['load']) {
  name = 'virtual:' + name
  return {
    name: `rsc:virtual-${name}`,
    resolveId(source, _importer, _options) {
      return source === name ? '\0' + name : undefined
    },
    load(id, options) {
      if (id === '\0' + name) {
        return (load as Function).apply(this, [id, options])
      }
    },
  } satisfies Plugin
}

function generateDynamicImportCode(map: Record<string, string>) {
  let code = Object.entries(map)
    .map(
      ([key, id]) =>
        `${JSON.stringify(key)}: () => import(${JSON.stringify(id)}),`,
    )
    .join('\n')
  return `export default {${code}};\n`
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

function assetsURL(url: string) {
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

function assetsURLOfDeps(deps: AssetDeps) {
  return {
    js: deps.js.map((href) => {
      assert(typeof href === 'string')
      return assetsURL(href)
    }),
    css: deps.css.map((href) => {
      assert(typeof href === 'string')
      return assetsURL(href)
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
// support findSourceMapURL
// https://github.com/facebook/react/pull/29708
// https://github.com/facebook/react/pull/30741
//

export function vitePluginFindSourceMapURL(): Plugin[] {
  return [
    {
      name: 'rsc:findSourceMapURL',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url!, `http://localhost`)
          if (url.pathname === '/__vite_rsc_findSourceMapURL') {
            let filename = url.searchParams.get('filename')!
            let environmentName = url.searchParams.get('environmentName')!
            try {
              const map = await findSourceMapURL(
                server,
                filename,
                environmentName,
              )
              res.setHeader('content-type', 'application/json')
              if (!map) res.statusCode = 404
              res.end(JSON.stringify(map ?? {}))
            } catch (e) {
              next(e)
            }
            return
          }
          next()
        })
      },
    },
  ]
}

export async function findSourceMapURL(
  server: ViteDevServer,
  filename: string,
  environmentName: string,
): Promise<object | undefined> {
  // this is likely server external (i.e. outside of Vite processing)
  if (filename.startsWith('file://')) {
    filename = fileURLToPath(filename)
    if (fs.existsSync(filename)) {
      // line-by-line identity source map
      const content = fs.readFileSync(filename, 'utf-8')
      return {
        version: 3,
        sources: [filename],
        sourcesContent: [content],
        mappings: 'AAAA' + ';AACA'.repeat(content.split('\n').length),
      }
    }
    return
  }

  // server component stack, replace log, `registerServerReference`, etc...
  let mod: EnvironmentModuleNode | undefined
  let map:
    | NonNullable<EnvironmentModuleNode['transformResult']>['map']
    | undefined
  if (environmentName === 'Server') {
    mod = server.environments.rsc!.moduleGraph.getModuleById(filename)
    // React extracts stacktrace via resetting `prepareStackTrace` on the server
    // and let browser devtools handle the mapping.
    // https://github.com/facebook/react/blob/4a36d3eab7d9bbbfae62699989aa95e5a0297c16/packages/react-server/src/ReactFlightStackConfigV8.js#L15-L20
    // This means it has additional +2 line offset due to Vite's module runner
    // function wrapper. We need to correct it just like Vite module runner.
    // https://github.com/vitejs/vite/blob/d94e7b25564abb81ab7b921d4cd44d0f0d22fec4/packages/vite/src/shared/utils.ts#L58-L69
    // https://github.com/vitejs/vite/blob/d94e7b25564abb81ab7b921d4cd44d0f0d22fec4/packages/vite/src/node/ssr/fetchModule.ts#L142-L146
    map = mod?.transformResult?.map
    if (map && map.mappings) {
      map = { ...map, mappings: (';;' + map.mappings) as any }
    }
  }

  const base = server.config.base.slice(0, -1)

  // `createServerReference(... findSourceMapURL ...)` called on browser
  if (environmentName === 'Client') {
    try {
      const url = new URL(filename).pathname.slice(base.length)
      mod = server.environments.client.moduleGraph.urlToModuleMap.get(url)
      map = mod?.transformResult?.map
    } catch (e) {}
  }

  if (mod && map) {
    // fix sources to match Vite's module url on browser
    return { ...map, sources: [base + mod.url] }
  }
}

//
// css support
//

export function vitePluginRscCss(
  rscCssOptions?: Pick<RscPluginOptions, 'rscCssTransform'>,
): Plugin[] {
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
      name: 'rsc:css/dev-ssr-virtual',
      resolveId(source) {
        if (source.startsWith('virtual:vite-rsc/css/dev-ssr/')) {
          return '\0' + source
        }
      },
      async load(id) {
        if (id.startsWith('\0virtual:vite-rsc/css/dev-ssr/')) {
          id = id.slice('\0virtual:vite-rsc/css/dev-ssr/'.length)
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
          const hrefs = result.hrefs.map((href) => assetsURL(href.slice(1)))
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
          const importId = `virtual:vite-rsc/importer-resources?importer=${encodeURIComponent(
            importer,
          )}`

          // use dynamic import during dev to delay crawling and discover css correctly.
          let replacement: string
          if (this.environment.mode === 'dev') {
            replacement = `__vite_rsc_react__.createElement(async () => {
              const __m = await import(${JSON.stringify(importId)});
              return __vite_rsc_react__.createElement(__m.Resources);
            })`
          } else {
            const hash = hashString(importId)
            if (!code.includes(`__vite_rsc_importer_resources_${hash}`)) {
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
      resolveId(source) {
        if (
          source.startsWith('virtual:vite-rsc/importer-resources?importer=')
        ) {
          assert(this.environment.name === 'rsc')
          return '\0' + source
        }
      },
      load(id) {
        if (id.startsWith('\0virtual:vite-rsc/importer-resources?importer=')) {
          const importer = decodeURIComponent(
            parseIdQuery(id).query['importer']!,
          )
          if (this.environment.mode === 'dev') {
            const result = collectCss(server.environments.rsc!, importer)
            const cssHrefs = result.hrefs.map((href) => href.slice(1))
            const jsHrefs = [
              '@id/__x00__virtual:vite-rsc/importer-resources-browser?importer=' +
                encodeURIComponent(importer),
            ]
            const deps = assetsURLOfDeps({ css: cssHrefs, js: jsHrefs })
            return generateResourcesCode(serializeValueWithRuntime(deps))
          } else {
            const key = normalizePath(path.relative(config.root, importer))
            serverResourcesMetaMap[importer] = { key }
            return `
              import __vite_rsc_assets_manifest__ from "virtual:vite-rsc/assets-manifest";
              ${generateResourcesCode(
                `__vite_rsc_assets_manifest__.serverResources[${JSON.stringify(
                  key,
                )}]`,
              )}
            `
          }
        }
        if (
          id.startsWith(
            '\0virtual:vite-rsc/importer-resources-browser?importer=',
          )
        ) {
          assert(this.environment.name === 'client')
          assert(this.environment.mode === 'dev')
          const importer = decodeURIComponent(
            parseIdQuery(id).query['importer']!,
          )
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
          const mods = collectModuleDependents(ctx.modules)
          for (const mod of mods) {
            if (mod.id) {
              const importer = encodeURIComponent(mod.id)
              invalidteModuleById(
                server.environments.rsc!,
                `\0virtual:vite-rsc/importer-resources?importer=${importer}`,
              )
              invalidteModuleById(
                server.environments.client,
                `\0virtual:vite-rsc/importer-resources-browser?importer=${importer}`,
              )
            }
          }
        }
      },
    },
    createVirtualPlugin(
      'vite-rsc/remove-duplicate-server-css',
      async function () {
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

function generateResourcesCode(depsCode: string) {
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
          React.createElement(RemoveDuplicateServerCss, { key: '' }),
      ])
    }
  }

  return `
import __vite_rsc_react__ from "react";

${
  config.mode === 'serve'
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

/**
 * temporary workaround for
 * - https://github.com/cloudflare/workers-sdk/issues/9538 (fixed in @cloudflare/vite-plugin@1.8.0)
 * - https://github.com/vitejs/vite/pull/20077 (fixed in vite@7.0.0)
 */
export function __fix_cloudflare(): Plugin {
  return {
    name: 'rsc:workaround-cloudflare',
    enforce: 'post',
    config(config) {
      // https://github.com/cloudflare/workers-sdk/issues/9538
      const plugin = config
        .plugins!.flat()
        .find((p) => p && 'name' in p && p.name === 'vite-plugin-cloudflare')
      const original = (plugin as any).configResolved
      ;(plugin as any).configResolved = function (this: any, ...args: any[]) {
        try {
          return original.apply(this, args)
        } catch (e) {}
      }

      // workaround (fixed in Vite 7) https://github.com/vitejs/vite/pull/20077
      ;(config.environments as any).ssr.resolve.noExternal = true
      ;(config.environments as any).rsc.resolve.noExternal = true
    },
  }
}

// https://github.com/vercel/next.js/blob/90f564d376153fe0b5808eab7b83665ee5e08aaf/packages/next/src/build/webpack-config.ts#L1249-L1280
// https://github.com/pcattori/vite-env-only/blob/68a0cc8546b9a37c181c0b0a025eb9b62dbedd09/src/deny-imports.ts
// https://github.com/sveltejs/kit/blob/84298477a014ec471839adf7a4448d91bc7949e4/packages/kit/src/exports/vite/index.js#L513
function validateImportPlugin(): Plugin {
  return {
    name: 'rsc:validate-imports',
    resolveId: {
      order: 'pre',
      async handler(source, importer, options) {
        // optimizer is not aware of server/client boudnary so skip
        if ('scan' in options && options.scan) {
          return
        }

        // Validate client-only imports in server environments
        if (source === 'client-only') {
          if (this.environment.name === 'rsc') {
            throw new Error(
              `'client-only' cannot be imported in server build (importer: '${importer ?? 'unknown'}', environment: ${this.environment.name})`,
            )
          }
          return { id: `\0virtual:vite-rsc/empty`, moduleSideEffects: false }
        }
        if (source === 'server-only') {
          if (this.environment.name !== 'rsc') {
            throw new Error(
              `'server-only' cannot be imported in client build (importer: '${importer ?? 'unknown'}', environment: ${this.environment.name})`,
            )
          }
          return { id: `\0virtual:vite-rsc/empty`, moduleSideEffects: false }
        }

        return
      },
    },
    load(id) {
      if (id.startsWith('\0virtual:vite-rsc/empty')) {
        return `export {}`
      }
    },
  }
}

function sortObject<T extends object>(o: T) {
  return Object.fromEntries(
    Object.entries(o).sort(([a], [b]) => a.localeCompare(b)),
  ) as T
}
