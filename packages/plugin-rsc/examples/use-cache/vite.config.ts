import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import { transformHoistInlineDirective } from '@vitejs/plugin-rsc/transforms'
import { defineConfig, parseAstAsync, type Plugin } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    useCachePlugin(),
    rsc({
      entries: {
        client: './src/framework/entry.browser.tsx',
        ssr: './src/framework/entry.ssr.tsx',
        rsc: './src/framework/entry.rsc.tsx',
      },
    }),
  ],
})

function useCachePlugin(): Plugin {
  return {
    name: 'use-cache',
    async transform(code) {
      if (!code.includes('use cache')) return
      const ast = await parseAstAsync(code)
      // @ts-ignore for rolldown-vite CI estree/oxc mismatch
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
  }
}
