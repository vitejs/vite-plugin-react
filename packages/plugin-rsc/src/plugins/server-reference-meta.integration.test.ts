import path from 'node:path'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'
import { type PluginApi, vitePluginRscMinimal } from '../plugin'

const root = path.join(import.meta.dirname, 'fixtures/server-reference-meta')

describe('server reference metadata', () => {
  it('distinguishes inline actions from module-level actions', async () => {
    const plugins = vitePluginRscMinimal({
      enableActionEncryption: false,
      environment: { rsc: 'client' },
    })
    const manager = (
      plugins.find((plugin) => plugin.name === 'rsc:minimal')!.api as PluginApi
    ).manager

    await build({
      root,
      logLevel: 'silent',
      build: {
        write: false,
        rollupOptions: { input: path.join(root, 'entry.js') },
      },
      plugins,
    })

    const inlineMeta = Object.values(manager.serverReferenceMetaMap).find(
      (meta) => meta.importId.endsWith('/inline.js'),
    )
    expect(inlineMeta?.inlineExportNames).toEqual(inlineMeta?.exportNames)
    expect(inlineMeta?.inlineExportNames).toEqual([
      expect.stringMatching(/inlineAction$/),
    ])

    const moduleMeta = Object.values(manager.serverReferenceMetaMap).find(
      (meta) => meta.importId.endsWith('/module.js'),
    )
    expect(moduleMeta).toMatchObject({
      exportNames: ['moduleAction'],
      inlineExportNames: [],
    })
  })
})
