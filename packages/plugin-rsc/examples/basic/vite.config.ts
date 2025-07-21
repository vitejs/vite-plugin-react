import assert from 'node:assert'
import rsc, { transformHoistInlineDirective } from '@vitejs/plugin-rsc'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { type Plugin, defineConfig, normalizePath, parseAstAsync } from 'vite'
import inspect from 'vite-plugin-inspect'
import path from 'node:path'

export default defineConfig({
  base: process.env.TEST_BASE ? '/custom-base/' : undefined,
  clearScreen: false,
  plugins: [
    tailwindcss(),
    process.env.TEST_REACT_COMPILER
      ? react({
          babel: { plugins: ['babel-plugin-react-compiler'] },
        }).map((p) => ({
          ...p,
          applyToEnvironment: (e) => e.name === 'client',
        }))
      : react(),
    vitePluginUseCache(),
    rsc({
      entries: {
        client: './src/framework/entry.browser.tsx',
        ssr: './src/framework/entry.ssr.tsx',
        rsc: './src/server.tsx',
      },
      // disable auto css injection to manually test `loadCss` feature.
      rscCssTransform: false,
      ignoredPackageWarnings: [/@vitejs\/test-dep-/],
      copyServerAssetsToClient: (fileName) =>
        fileName !== '__server_secret.txt',
    }),
    // avoid ecosystem CI fail due to vite-plugin-inspect compatibility
    !process.env.ECOSYSTEM_CI && inspect(),
    {
      name: 'test-client-reference-tree-shaking',
      enforce: 'post',
      writeBundle(_options, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk') {
            assert(!chunk.code.includes('__unused_client_reference__'))
          }
        }
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
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`,
          })
        }
      },
    },
  ],
  build: {
    minify: false,
    manifest: true,
  },
  optimizeDeps: {
    exclude: [
      '@vitejs/test-dep-client-in-server/client',
      '@vitejs/test-dep-client-in-server2/client',
      '@vitejs/test-dep-server-in-client/client',
    ],
  },
}) as any

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
