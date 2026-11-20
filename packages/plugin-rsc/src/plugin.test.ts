import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createServer, normalizePath, resolveConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import rsc, { type RscPluginOptions } from './plugin'

async function getReactServerDomIncludes(options: RscPluginOptions) {
  const config = await resolveConfig(
    { configFile: false, logLevel: 'silent', plugins: [rsc(options)] },
    'serve',
  )
  const includes: Record<string, string[]> = {}
  for (const name of ['ssr', 'rsc']) {
    includes[name] = (config.environments[name]!.optimizeDeps.include ?? [])
      .filter((id) => /react-server-dom|react-dom\/(server|static)/.test(id))
      .map((id) => id.replace(/^.*react-server-dom[^/]*\//, 'rsd/'))
  }
  return { config, includes }
}

describe('reactServerDomBuild', () => {
  it('pre-bundles edge builds by default', async () => {
    const { includes } = await getReactServerDomIncludes({})
    expect(includes).toEqual({
      ssr: [
        'react-dom/server.edge',
        'react-dom/static.edge',
        'rsd/client.edge',
      ],
      rsc: ['rsd/server.edge', 'rsd/static.edge', 'rsd/client.edge'],
    })
  })

  it('pre-bundles node builds', async () => {
    const { includes } = await getReactServerDomIncludes({
      reactServerDomBuild: 'node',
    })
    expect(includes).toEqual({
      ssr: [
        'react-dom/server.node',
        'react-dom/static.node',
        'rsd/client.node',
      ],
      rsc: ['rsd/server.node', 'rsd/static.node', 'rsd/client.node'],
    })
  })

  it('selects a build per environment from the resolved config', async () => {
    const calls: unknown[] = []
    const { config, includes } = await getReactServerDomIncludes({
      reactServerDomBuild: (context) => {
        calls.push(context)
        return context.environmentName === 'rsc' ? 'node' : 'edge'
      },
    })
    expect(includes).toEqual({
      ssr: [
        'react-dom/server.edge',
        'react-dom/static.edge',
        'rsd/client.edge',
      ],
      rsc: ['rsd/server.node', 'rsd/static.node', 'rsd/client.node'],
    })
    expect(calls).toEqual([
      { environmentName: 'ssr', config },
      { environmentName: 'rsc', config },
    ])
  })

  it.each([
    [{}, 'edge'],
    [{ reactServerDomBuild: 'node' }, 'node'],
  ] as const)(
    'resolves react-server-dom entries in dev (%j)',
    async (options, build) => {
      const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-rsc-test-'))
      const server = await createServer({
        configFile: false,
        logLevel: 'silent',
        cacheDir,
        server: { middlewareMode: true, ws: false },
        plugins: [rsc({ ...options, serverHandler: false })],
      })
      try {
        const resolved: Record<string, string[]> = {}
        for (const name of ['rsc', 'ssr', 'client']) {
          resolved[name] = []
          for (const entry of ['server', 'static', 'client']) {
            const result = await server.environments[
              name
            ]!.pluginContainer.resolveId(
              `@vitejs/plugin-rsc/react-server-dom/${entry}`,
            )
            // e.g. `.vite/deps_rsc/@vitejs_plugin-rsc_vendor_react-server-dom_server__node.js`
            const match = result?.id.match(
              /(server|static|client)(?:__|\.)(\w+)\.js(?:\?|$)/,
            )
            resolved[name].push(match ? `${match[1]}.${match[2]}` : 'none')
          }
        }
        expect(resolved).toEqual({
          rsc: [`server.${build}`, `static.${build}`, `client.${build}`],
          ssr: [`server.${build}`, `static.${build}`, `client.${build}`],
          // React's server builds don't run in a browser
          client: ['server.edge', 'static.edge', 'client.edge'],
        })
        // the rsc environment imports the entries pre-bundled for it
        const optimized =
          await server.environments.rsc!.pluginContainer.resolveId(
            '@vitejs/plugin-rsc/react-server-dom/server',
          )
        expect(optimized?.id).toContain(
          normalizePath(path.join(cacheDir, 'deps_rsc')),
        )
      } finally {
        await server.close()
        fs.rmSync(cacheDir, { recursive: true, force: true })
      }
    },
  )
})
