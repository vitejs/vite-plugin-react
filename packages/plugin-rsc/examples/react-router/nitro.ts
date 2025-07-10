import {
  build,
  copyPublicAssets,
  createNitro,
  prepare,
  type NitroConfig,
} from 'nitropack'
import type { PresetName } from 'nitropack/presets'
import type { Plugin, ViteBuilder } from 'vite'

// Using Nitro as post-build to target deployment platform. Inspired by Tanstack Start's approach.
// https://github.com/TanStack/router/blob/5fd079e482b1252b8b11a936f1524a0dee368cae/packages/start-plugin-core/src/nitro-plugin/plugin.ts

// The goal is to replace framework's hand-written post-build scripts, such as
// https://github.com/hi-ogawa/waku/blob/084c71a6d2450b4a69146e97b0005d59ee9394cd/packages/waku/src/vite-rsc/deploy/vercel/plugin.ts

type NitroPluginOptions = {
  preset: PresetName
  clientDir: string
  serverEntry: string
}

export function nitroPlugin(nitroPluginOptions: NitroPluginOptions): Plugin[] {
  return [
    {
      name: 'nitro',
      apply: 'build',

      // TODO: might want to reuse some platform specific resolution etc...
      configEnvironment() {
        return {
          resolve: {},
        }
      },

      // reuse Nitro for post-build
      buildApp: {
        order: 'post',
        handler: async (builder) => {
          await buildNitroApp(builder, nitroPluginOptions)
        },
      },
    },
  ]
}

async function buildNitroApp(
  _builder: ViteBuilder,
  nitroPluginOptions: NitroPluginOptions,
) {
  const nitroConfig: NitroConfig = {
    // ===
    // === essential features
    // ===
    preset: nitroPluginOptions.preset,
    publicAssets: [
      {
        dir: nitroPluginOptions.clientDir,
        baseURL: '/',
        maxAge: 31536000, // 1 year
      },
    ],
    renderer: 'virtual:renderer-entry',
    rollupConfig: {
      plugins: [
        {
          name: 'virtual-server-entry',
          resolveId(source) {
            if (source === 'virtual:renderer-entry') {
              return '\0' + source
            }
            if (source === 'virtual:renderer-entry-inner') {
              return this.resolve(nitroPluginOptions.serverEntry)
            }
          },
          load(id) {
            if (id === '\0virtual:renderer-entry') {
              return `\
import handler from 'virtual:renderer-entry-inner';
import { defineEventHandler, toWebRequest } from "h3"
export default defineEventHandler((event) => handler(toWebRequest(event)))
`
            }
          },
        },
        // TODO: preserve server source maps
        // virtualBundlePlugin(getSsrBundle()),
      ],
    },

    // ===
    // === basic settings
    // ===
    buildDir: 'dist/nitro/build',
    output: { dir: 'dist/nitro/output' },

    // ===
    // === disable other features
    // ===
    dev: false,
    // TODO: do we need this? should this be made configurable?
    compatibilityDate: '2024-11-19',
    // logLevel: 3,
    // baseURL: globalThis.TSS_APP_BASE,
    // TODO: how to avoid .nitro/types?
    typescript: {
      generateRuntimeConfigTypes: false,
      generateTsConfig: false,
    },
    prerender: undefined,
    plugins: [], // Nitro's plugins
    appConfigFiles: [],
    scanDirs: [],
    imports: false, // unjs/unimport for global/magic imports
    virtual: {
      // This is Nitro's way of defining virtual modules
      // Should we define the ones for TanStack Start's here as well?
    },
  }

  const nitro = await createNitro(nitroConfig)
  await prepare(nitro)
  await copyPublicAssets(nitro)
  await prerender()
  await build(nitro)
  await nitro.close()

  // TODO
  async function prerender() {}
}
