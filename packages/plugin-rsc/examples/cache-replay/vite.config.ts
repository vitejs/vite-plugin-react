import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import rsc, { getPluginApi } from '@vitejs/plugin-rsc'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  const isBuild = command === 'build'
  return {
    plugins: [
      rsc({
        customBuildApp: isBuild,
      }),
      react(),
    ],
    builder: isBuild
      ? {
          sharedPlugins: true,
          sharedConfigBuild: true,
          async buildApp(builder) {
            const { manager } = getPluginApi(builder.config)!
            const rscEnvironment = builder.environments.rsc!
            const ssrEnvironment = builder.environments.ssr!
            const runtimeInput = rscEnvironment.config.build.rollupOptions.input
            const runtimeOutDir = rscEnvironment.config.build.outDir
            const prerenderOutDir = path.resolve(
              builder.config.root,
              'dist/prerender',
            )

            // Build and execute the route in the prerender pass. The query
            // busts the ES module cache so a rebuilt prerender bundle
            // re-executes when buildApp runs more than once in one process.
            rscEnvironment.config.build.rollupOptions.input = {
              prerender: './src/framework/entry.prerender.rsc.tsx',
            }
            rscEnvironment.config.build.outDir = prerenderOutDir
            await builder.build(rscEnvironment)
            await import(
              pathToFileURL(path.join(prerenderOutDir, 'prerender.js')).href +
                `?t=${Date.now()}`
            )

            // Register references reachable only from the runtime graphs
            // before the server-references manifest is emitted, matching the
            // scan passes of the default build.
            rscEnvironment.config.build.rollupOptions.input = runtimeInput
            rscEnvironment.config.build.outDir = runtimeOutDir
            manager.isScanBuild = true
            rscEnvironment.config.build.write = false
            ssrEnvironment.config.build.write = false
            await builder.build(rscEnvironment)
            await builder.build(ssrEnvironment)
            manager.isScanBuild = false
            rscEnvironment.config.build.write = true
            ssrEnvironment.config.build.write = true

            // Build the runtime without rerunning the prerendered component.
            fs.rmSync(runtimeOutDir, { recursive: true, force: true })
            await builder.build(rscEnvironment)
            manager.stabilize()
            await builder.build(builder.environments.client!)
            await builder.build(ssrEnvironment)
            manager.writeAssetsManifest(['ssr', 'rsc'])
            manager.writeEnvironmentImportsManifest()
          },
        }
      : undefined,
    environments: {
      rsc: {
        build: {
          rollupOptions: {
            input: {
              index: isBuild
                ? './src/framework/entry.runtime.rsc.tsx'
                : './src/framework/entry.rsc.tsx',
            },
          },
        },
      },
      ssr: {
        build: {
          rollupOptions: {
            input: { index: './src/framework/entry.ssr.tsx' },
          },
        },
      },
      client: {
        build: {
          rollupOptions: {
            input: { index: './src/framework/entry.browser.tsx' },
          },
        },
      },
    },
  }
})
