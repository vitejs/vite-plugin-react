import assert from 'node:assert'
import rsc, { transformHoistInlineDirective } from '@vitejs/plugin-rsc'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import {
  type Plugin,
  type Rollup,
  defineConfig,
  normalizePath,
  parseAstAsync,
} from 'vite'
// import inspect from 'vite-plugin-inspect'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  clearScreen: false,
  plugins: [
    // inspect(),
    tailwindcss(),
    react(),
    vitePluginUseCache(),
    rsc({
      entries: {
        client: './src/framework/entry.browser.tsx',
        ssr: './src/framework/entry.ssr.tsx',
        rsc: './src/server.tsx',
      },
      // disable auto css injection to manually test `loadCss` feature.
      rscCssTransform: false,
      copyServerAssetsToClient: (fileName) =>
        fileName !== '__server_secret.txt',
      clientChunks(meta) {
        if (process.env.TEST_CUSTOM_CLIENT_CHUNKS) {
          if (meta.id.includes('/src/routes/chunk/')) {
            return 'custom-chunk'
          }
        }
      },
    }),
    {
      name: 'test-tree-shake',
      enforce: 'post',
      writeBundle(_options, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk') {
            assert(!chunk.code.includes('__unused_client_reference__'))
            assert(!chunk.code.includes('__unused_server_export__'))
          }
        }
      },
    },
    {
      // dump entire bundle to analyze build output for e2e
      name: 'test-metadata',
      enforce: 'post',
      writeBundle(options, bundle) {
        const chunks: Rollup.OutputChunk[] = []
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk') {
            chunks.push(chunk)
          }
        }
        fs.writeFileSync(
          path.join(options.dir!, '.vite/test.json'),
          JSON.stringify({ chunks }, null, 2),
        )
      },
    },
    {
      name: 'test-server-assets-security',
      buildStart() {
        if (this.environment.name === 'rsc') {
          this.emitFile({
            type: 'asset',
            fileName: '__server_secret.txt',
            source: '__server_secret',
          })
        }
      },
      writeBundle(_options, bundle) {
        if (this.environment.name === 'rsc') {
          assert(Object.keys(bundle).includes('__server_secret.txt'))
        } else {
          assert(!Object.keys(bundle).includes('__server_secret.txt'))
        }

        const viteManifest = bundle['.vite/manifest.json']
        assert(viteManifest.type === 'asset')
        assert(typeof viteManifest.source === 'string')
        if (this.environment.name === 'rsc') {
          assert(viteManifest.source.includes('src/server.tsx'))
          assert(
            !viteManifest.source.includes('src/framework/entry.browser.tsx'),
          )
        }
        if (this.environment.name === 'client') {
          assert(!viteManifest.source.includes('src/server.tsx'))
          assert(
            viteManifest.source.includes('src/framework/entry.browser.tsx'),
          )
        }
      },
    },
    {
      name: 'test-browser-only',
      writeBundle(_options, bundle) {
        const moduleIds = Object.values(bundle).flatMap((c) =>
          c.type === 'chunk' ? [...c.moduleIds] : [],
        )
        const browserId = normalizePath(
          path.resolve('src/routes/browser-only/browser-dep.tsx'),
        )
        if (this.environment.name === 'client') {
          assert(moduleIds.includes(browserId))
        }
        if (this.environment.name === 'ssr') {
          assert(!moduleIds.includes(browserId))
        }
      },
    },
    {
      name: 'optimize-chunks',
      apply: 'build',
      config() {
        const resolvePackageSource = (source: string) =>
          normalizePath(fileURLToPath(import.meta.resolve(source)))

        // TODO: this package entry isn't a public API.
        const reactServerDom = resolvePackageSource(
          '@vitejs/plugin-rsc/react/browser',
        )

        return {
          environments: {
            client: {
              build: {
                rollupOptions: {
                  output: {
                    manualChunks: (id) => {
                      // need to use functional form to handle commonjs plugin proxy module
                      // e.g. `(id)?commonjs-es-import`
                      if (
                        id.includes('node_modules/react/') ||
                        id.includes('node_modules/react-dom/') ||
                        id.includes(reactServerDom)
                      ) {
                        return 'lib-react'
                      }
                      if (id === '\0vite/preload-helper.js') {
                        return 'lib-vite'
                      }
                    },
                  },
                },
              },
            },
          },
        }
      },
      // verify chunks are "stable"
      writeBundle(_options, bundle) {
        if (this.environment.name === 'client') {
          const entryChunks: Rollup.OutputChunk[] = []
          const libChunks: Record<string, Rollup.OutputChunk[]> = {}
          for (const chunk of Object.values(bundle)) {
            if (chunk.type === 'chunk') {
              if (chunk.isEntry) {
                entryChunks.push(chunk)
              }
              if (chunk.name.startsWith('lib-')) {
                ;(libChunks[chunk.name] ??= []).push(chunk)
              }
            }
          }

          // react vendor chunk has no import
          assert.equal(libChunks['lib-react'].length, 1)
          assert.deepEqual(
            // https://rolldown.rs/guide/in-depth/advanced-chunks#why-there-s-always-a-runtime-js-chunk
            libChunks['lib-react'][0].imports.filter(
              (f) => !f.includes('rolldown-runtime'),
            ),
            [],
          )
          assert.deepEqual(libChunks['lib-react'][0].dynamicImports, [])

          // entry chunk has no export
          assert.equal(entryChunks.length, 1)
          assert.deepEqual(entryChunks[0].exports, [])
        }
      },
    },
    {
      name: 'cf-build',
      enforce: 'post',
      apply: () => !!process.env.CF_BUILD,
      configEnvironment() {
        return {
          keepProcessEnv: false,
          define: {
            'process.env.NO_CSP': 'false',
          },
          resolve: {
            noExternal: true,
          },
        }
      },
      generateBundle() {
        if (this.environment.name === 'rsc') {
          this.emitFile({
            type: 'asset',
            fileName: 'cloudflare.js',
            source: `\
import handler from './index.js';
export default { fetch: handler };
`,
          })
        }
        if (this.environment.name === 'client') {
          // https://developers.cloudflare.com/workers/static-assets/headers/#custom-headers
          this.emitFile({
            type: 'asset',
            fileName: '_headers',
            source: `\
/favicon.ico
  Cache-Control: public, max-age=3600, s-maxage=3600
/test.css
  Cache-Control: public, max-age=3600, s-maxage=3600
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`,
          })
        }
      },
    },
    testScanPlugin(),
  ],
  build: {
    minify: false,
    manifest: true,
  },
  environments: {
    client: {
      optimizeDeps: {
        entries: [
          './src/routes/**/client.tsx',
          './src/framework/entry.browser.tsx',
        ],
        exclude: [
          '@vitejs/test-dep-client-in-server/client',
          '@vitejs/test-dep-client-in-server2/client',
          '@vitejs/test-dep-server-in-client/client',
        ],
      },
    },
    ssr: {
      optimizeDeps: {
        include: ['@vitejs/test-dep-transitive-cjs > @vitejs/test-dep-cjs'],
      },
    },
  },
}) as any

function testScanPlugin(): Plugin[] {
  const moduleIds: { name: string; ids: string[] }[] = []
  return [
    {
      name: 'test-scan',
      apply: 'build',
      buildEnd() {
        moduleIds.push({
          name: this.environment.name,
          ids: [...this.getModuleIds()],
        })
      },
      buildApp: {
        order: 'post',
        async handler() {
          // client scan build discovers additional modules for server references.
          const [m1, m2] = moduleIds.filter((m) => m.name === 'rsc')
          const diff = m2.ids.filter((id) => !m1.ids.includes(id))
          assert(diff.length > 0)

          // but make sure it's not due to import.meta.glob
          // https://github.com/vitejs/rolldown-vite/issues/373
          assert.equal(
            diff.find((id) => id.includes('import-meta-glob/dep.tsx')),
            undefined,
          )
        },
      },
    },
  ]
}

function vitePluginUseCache(): Plugin[] {
  return [
    {
      name: 'use-cache',
      async transform(code) {
        if (!code.includes('use cache')) return
        const ast = await parseAstAsync(code)
        // @ts-ignore for rolldown-vite ci estree/oxc mismatch
        const result = transformHoistInlineDirective(code, ast, {
          runtime: (value) => `__vite_rsc_cache(${value})`,
          directive: 'use cache',
          rejectNonAsyncFunction: true,
          noExport: true,
        })
        if (!result.output.hasChanged()) return
        result.output.prepend(
          `import __vite_rsc_cache from "/src/framework/use-cache-runtime";`,
        )
        return {
          code: result.output.toString(),
          map: result.output.generateMap({ hires: 'boundary' }),
        }
      },
    },
  ]
}
