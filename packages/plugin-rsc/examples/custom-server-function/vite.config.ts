import react from '@vitejs/plugin-react'
import rsc, { getPluginApi } from '@vitejs/plugin-rsc'
import { transformHoistInlineDirective } from '@vitejs/plugin-rsc/transforms'
import { defineConfig, parseAstAsync, type Plugin } from 'vite'

const owner = 'example:use-custom-server'

export default defineConfig({
  plugins: [customServerFunction(), rsc(), react()],
  environments: {
    rsc: {
      build: {
        rollupOptions: { input: { index: './src/framework/entry.rsc.tsx' } },
      },
    },
    ssr: {
      build: {
        rollupOptions: { input: { index: './src/framework/entry.ssr.tsx' } },
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
})

function customServerFunction(): Plugin {
  let manager: NonNullable<ReturnType<typeof getPluginApi>>['manager']

  return {
    name: 'example:custom-server-function',
    configResolved(config) {
      manager = getPluginApi(config)!.manager
    },
    async transform(code, id) {
      if (this.environment.name !== 'rsc') {
        manager.serverReferences.replaceClaim(
          owner,
          this.environment.name,
          id,
          undefined,
        )
        return
      }
      if (!code.includes('use custom-server')) {
        manager.serverReferences.clearClaims(owner, id)
        return
      }

      const reference = manager.serverReferences.resolve(id, 'rsc')
      const ast = (await parseAstAsync(code)) as unknown as Parameters<
        typeof transformHoistInlineDirective
      >[1]
      const result = transformHoistInlineDirective(code, ast, {
        directive: 'use custom-server',
        rejectNonAsyncFunction: true,
        runtime: (value, name) =>
          `$$CustomReactServer.registerServerReference(${value}, ${JSON.stringify(reference.referenceKey)}, ${JSON.stringify(name)})`,
      })
      if (!result.output.hasChanged()) {
        manager.serverReferences.clearClaims(owner, id)
        return
      }

      manager.serverReferences.clearClaims(owner, id)
      manager.serverReferences.replaceClaim(owner, this.environment.name, id, {
        ...reference,
        exportNames: result.names,
      })
      result.output.prepend(
        `import * as $$CustomReactServer from "@vitejs/plugin-rsc/react/rsc/server";\n`,
      )
      return {
        code: result.output.toString(),
        map: result.output.generateMap({ hires: 'boundary' }),
      }
    },
  }
}
