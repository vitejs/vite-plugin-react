import path from 'node:path'
import { runtimePublicPath } from '@vitejs/react-common'
import { type Plugin, rolldown } from 'rolldown'
import { expect, test } from 'vitest'
import pluginReact, { type Options } from '../src/index.ts'

test('HMR related code should not be included when using rolldown', async () => {
  const { output } = await bundleWithRolldown()

  expect(output[0].code).toBeDefined()
  expect(output[0].code).not.toContain('import.meta.hot')
})

test('HMR related code should not be included when using rolldown with babel plugin', async () => {
  const { output } = await bundleWithRolldown({
    babel: {
      plugins: [['babel-plugin-react-compiler', {}]],
    },
  })

  expect(output[0].code).toBeDefined()
  expect(output[0].code).not.toContain('import.meta.hot')
})

test('resolves base-prefixed refresh runtime id in bundledDev mode', () => {
  const plugins = pluginReact()

  const reactBabelPlugin = plugins.find(
    (plugin) => plugin.name === 'vite:react-babel',
  )
  reactBabelPlugin?.configResolved?.({
    base: '/ui/',
    command: 'serve',
    isProduction: false,
    root: '/',
    server: { hmr: true },
    plugins: [],
    experimental: { bundledDev: true },
  } as any)

  const reactRefreshResolvePlugin = plugins.find(
    (plugin) => plugin.name === 'vite:react-refresh-fbm-resolve-runtime',
  )
  expect(reactRefreshResolvePlugin?.resolveId).toBeDefined()

  const resolved = (reactRefreshResolvePlugin?.resolveId as any)(
    '/ui' + runtimePublicPath,
  )

  expect(resolved).toBe(runtimePublicPath)
})

async function bundleWithRolldown(pluginReactOptions: Options = {}) {
  const ENTRY = '/entry.tsx'
  const files: Record<string, string> = {
    [ENTRY]: /* tsx */ `
      import React from "react"
      import { hydrateRoot } from "react-dom/client"
      import App from "./App.tsx"

      const container = document.getElementById("root");
      hydrateRoot(container, <App />);
    `,
    '/App.tsx': /* tsx */ `
      export default function App() {
        return <div>Hello World</div>
      }
    `,
  }

  const bundle = await rolldown({
    input: ENTRY,
    plugins: [virtualFilesPlugin(files), pluginReact(pluginReactOptions)],
    external: [/^react(\/|$)/, /^react-dom(\/|$)/],
  })
  return await bundle.generate({ format: 'esm' })
}

function virtualFilesPlugin(files: Record<string, string>): Plugin {
  return {
    name: 'virtual-files',
    resolveId(id, importer) {
      const baseDir = importer ? path.posix.dirname(importer) : '/'
      const result = path.posix.resolve(baseDir, id)
      if (result in files) {
        return result
      }
    },
    load(id) {
      if (id in files) {
        return files[id]
      }
    },
  }
}
