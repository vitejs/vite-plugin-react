import { describe, expect, it } from 'vitest'
import { vitePluginRscMinimal } from './plugin'

describe('server reference manifest', () => {
  it('preserves and deduplicates existing export names', async () => {
    const plugins = vitePluginRscMinimal({ enableActionEncryption: false })
    const minimalPlugin = plugins.find(
      (plugin) => plugin.name === 'rsc:minimal',
    )!
    const manager = (minimalPlugin.api as any).manager
    manager.config = {
      command: 'build',
      root: '/root',
    }

    const id = '/root/actions.ts'
    manager.serverReferenceMetaMap[id] = {
      importId: id,
      referenceKey: 'existing',
      exportNames: ['cached', 'action', 'cached'],
    }

    const useServerPlugin = plugins.find(
      (plugin) => plugin.name === 'rsc:use-server',
    )!
    const transformHandler = (useServerPlugin.transform as any).handler
    await transformHandler.call(
      {
        environment: { name: 'rsc', mode: 'build' },
        error(error: unknown) {
          throw error
        },
      },
      `"use server"; export async function action() {}`,
      id,
    )

    expect(manager.serverReferenceMetaMap[id].exportNames).toEqual([
      'cached',
      'action',
    ])

    const manifestPlugin = plugins.find(
      (plugin) => plugin.name === 'rsc:virtual-vite-rsc/server-references',
    )!
    const loadHandler = (manifestPlugin.load as any).handler
    const manifest = await loadHandler.call(
      { environment: { mode: 'build' } },
      '\0virtual:vite-rsc/server-references',
      {},
    )

    expect(manifest.code.match(/\bcached\b/g)).toHaveLength(2)
    expect(manifest.code.match(/\baction\b/g)).toHaveLength(2)
  })
})
