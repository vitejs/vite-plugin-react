import react from '@vitejs/plugin-react'
import rsc, { getPluginApi, type RscPluginManager } from '@vitejs/plugin-rsc'
import { transformHoistInlineDirective } from '@vitejs/plugin-rsc/transforms'
import { defineConfig, parseAstAsync, type Plugin } from 'vite'

const directive = 'use cache'
const pluginName = 'example:use-cache-callable'

export default defineConfig({
  plugins: [
    react(),
    callableCachePlugin(),
    rsc({
      entries: {
        client: './src/framework/entry.browser.tsx',
        ssr: './src/framework/entry.ssr.tsx',
        rsc: './src/framework/entry.rsc.tsx',
      },
    }),
  ],
})

function callableCachePlugin(): Plugin {
  let manager: RscPluginManager

  return {
    name: pluginName,
    configResolved(config) {
      manager = getPluginApi(config)!.manager
    },
    async transform(code, id) {
      if (this.environment.name !== 'rsc') return
      if (!code.includes(directive)) {
        manager.serverReferences.deleteClaim(pluginName, id)
        return
      }

      const reference = manager.serverReferences.resolve(id, 'rsc')
      const ast = (await parseAstAsync(code)) as unknown as Parameters<
        typeof transformHoistInlineDirective
      >[1]
      const result = transformHoistInlineDirective(code, ast, {
        directive,
        rejectNonAsyncFunction: true,
        hoistRuntime: true,
        runtime: (value, name) =>
          `$$ReactServer.registerServerReference(` +
          `$$cacheWrapper(${value}),` +
          `${JSON.stringify(reference.referenceKey)},` +
          `${JSON.stringify(name)})`,
      })
      if (!result.output.hasChanged()) {
        manager.serverReferences.deleteClaim(pluginName, id)
        return
      }

      manager.serverReferences.replaceClaim(pluginName, id, {
        ...reference,
        exportNames: result.names,
      })
      result.output.prepend(
        `import $$cacheWrapper from "/src/cache-runtime";\n` +
          `import * as $$ReactServer from "@vitejs/plugin-rsc/react/rsc/server";\n`,
      )
      return {
        code: result.output.toString(),
        map: result.output.generateMap({ hires: 'boundary' }),
      }
    },
  }
}
