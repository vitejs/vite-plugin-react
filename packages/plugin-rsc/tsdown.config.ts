import fs from 'node:fs'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/plugin.ts',
    'src/browser.ts',
    'src/ssr.tsx',
    'src/ssr.node.tsx',
    'src/rsc.tsx',
    'src/rsc/server.tsx',
    'src/rsc/client.ts',
    'src/rsc/static.tsx',
    'src/rsc.node.tsx',
    'src/rsc/server.node.tsx',
    'src/rsc/client.node.ts',
    'src/rsc/static.node.tsx',
    'src/core/browser.ts',
    'src/core/ssr.ts',
    'src/core/rsc.ts',
    'src/core/plugin.ts',
    'src/react/browser.ts',
    'src/react/ssr.ts',
    'src/react/ssr.node.ts',
    'src/react/rsc.ts',
    'src/react/rsc/server.ts',
    'src/react/rsc/client.ts',
    'src/react/rsc/static.ts',
    'src/react/rsc/server.node.ts',
    'src/react/rsc/client.node.ts',
    'src/react/rsc/static.node.ts',
    'src/transforms/index.ts',
    'src/plugins/cjs.ts',
    'src/utils/rpc.ts',
    'src/utils/encryption-runtime.ts',
  ],
  format: ['esm'],
  deps: {
    neverBundle: [
      /^virtual:/,
      /^@vitejs\/plugin-rsc\/vendor\//,
      /^@vitejs\/plugin-rsc\/react-server-dom\//,
    ],
    onlyBundle: ['@types/estree', 'picocolors'],
  },
  fixedExtension: false,
  dts: {
    sourcemap: process.argv.slice(2).includes('--sourcemap'),
  },
  plugins: [
    {
      name: 'vendor-react-server-dom',
      buildStart() {
        fs.rmSync('./dist/vendor/', { recursive: true, force: true })
        fs.mkdirSync('./dist/vendor', { recursive: true })
        fs.cpSync(
          './node_modules/react-server-dom-webpack',
          './dist/vendor/react-server-dom',
          { recursive: true, dereference: true },
        )
        fs.rmSync('./dist/vendor/react-server-dom/node_modules', {
          recursive: true,
          force: true,
        })

        // The `rsc:react-server-dom-build` plugin resolves
        // `@vitejs/plugin-rsc/react-server-dom/<entry>` to the build selected
        // by `reactServerDomBuild`. These modules are the fallback where the
        // plugin doesn't run, e.g. when the dep optimizer bundles plugin-rsc's
        // runtime, and keep the edge build.
        fs.rmSync('./dist/react-server-dom/', { recursive: true, force: true })
        fs.mkdirSync('./dist/react-server-dom', { recursive: true })
        for (const entry of ['server', 'static', 'client']) {
          fs.writeFileSync(
            `./dist/react-server-dom/${entry}.js`,
            `export * from '@vitejs/plugin-rsc/vendor/react-server-dom/${entry}.edge'\n`,
          )
        }
      },
    },
  ],
}) as any
