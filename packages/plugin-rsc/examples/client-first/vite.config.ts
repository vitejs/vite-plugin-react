import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import { defineConfig, type Plugin } from 'vite'

export default defineConfig({
  plugins: [
    createRscFnPlugin(),
    rsc({
      entries: {
        client: './src/framework/entry.browser.tsx',
        ssr: './src/framework/entry.ssr.tsx',
        rsc: './src/framework/entry.rsc.tsx',
      },
    }),
    react(),
  ],
})

// Keep marked RSC functions exported in the RSC environment for registry
// lookup, but make them local in browser/SSR so React sees a component-only
// export boundary and can preserve state during Fast Refresh. This temporary
// transform does not remove handler code from caller bundles.
function createRscFnPlugin(): Plugin {
  return {
    name: 'client-first:rsc-only-export',
    enforce: 'pre',
    transform(code) {
      if (
        this.environment.name !== 'rsc' &&
        code.includes('@rsc-only-export')
      ) {
        return {
          code: code.replace(
            /(\/\* @rsc-only-export \*\/\s*)export\b/g,
            '$1      ',
          ),
          map: null,
        }
      }
    },
  }
}
