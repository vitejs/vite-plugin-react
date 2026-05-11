import { describe, expect, test } from 'vitest'
import { vitePluginRscMinimal, type PluginApi } from './plugin'

describe('RscPluginManager compatibility version', () => {
  test('throws during build before finalization', () => {
    const manager = createManager()

    expect(() => manager.getCompatibilityManifest()).toThrow(
      /compatibility manifest is not ready/,
    )
    expect(() => manager.finalizeCompatibilityManifest()).toThrow(
      /requires the final assets manifest/,
    )
  })

  test('serializes normalized references and final build fingerprints', () => {
    const manager = createFinalizedManager({
      root: '/workspace/app',
      base: '/base/',
    })

    expect(manager.getCompatibilityManifest()).toMatchObject({
      version: 1,
      compatibilityVersion: expect.stringMatching(/^[a-f0-9]{64}$/),
      base: '/base/',
      assetsManifestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      bundles: {
        client: expect.stringMatching(/^[a-f0-9]{64}$/),
        rsc: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      clientReferences: [
        {
          id: 'src/button.tsx',
          referenceKey: 'button',
          renderedExports: ['Button'],
        },
      ],
      serverReferences: [
        {
          id: 'src/actions.ts',
          referenceKey: 'actions',
          exportNames: ['save'],
        },
      ],
    })
    expect(manager.getCompatibilityVersion()).toBe(
      manager.getCompatibilityManifest().compatibilityVersion,
    )
  })

  test('ignores client exports that are not rendered', () => {
    const manager = createFinalizedManager()
    const before = manager.getCompatibilityVersion()

    manager.clientReferenceMetaMap[
      '/workspace/app/src/button.tsx'
    ]!.exportNames = ['Button', 'Unused']
    manager.finalizeCompatibilityManifest()

    expect(manager.getCompatibilityVersion()).toBe(before)
  })

  test('changes when the rendered client export ABI changes', () => {
    const manager = createFinalizedManager()
    const before = manager.getCompatibilityVersion()

    manager.clientReferenceMetaMap[
      '/workspace/app/src/button.tsx'
    ]!.renderedExports = ['Button', 'ButtonIcon']
    manager.finalizeCompatibilityManifest()

    expect(manager.getCompatibilityVersion()).not.toBe(before)
  })

  test('changes when the server reference ABI changes', () => {
    const manager = createFinalizedManager()
    const before = manager.getCompatibilityVersion()

    manager.serverReferenceMetaMap[
      '/workspace/app/src/actions.ts'
    ]!.exportNames = ['delete', 'save']
    manager.finalizeCompatibilityManifest()

    expect(manager.getCompatibilityVersion()).not.toBe(before)
  })

  test('changes when the client assets manifest changes', () => {
    const manager = createFinalizedManager()
    const before = manager.getCompatibilityVersion()

    manager.buildAssetsManifest = {
      ...manager.buildAssetsManifest!,
      clientReferenceDeps: {
        button: {
          js: ['/assets/button.new.js'],
          css: [],
        },
      },
    }
    manager.finalizeCompatibilityManifest()

    expect(manager.getCompatibilityVersion()).not.toBe(before)
  })

  test('changes when final client bundle content changes', () => {
    const manager = createFinalizedManager()
    const before = manager.getCompatibilityVersion()

    manager.bundles.client = createBundle({
      'assets/button.js': 'export const Button = "new"',
    })
    manager.finalizeCompatibilityManifest()

    expect(manager.getCompatibilityVersion()).not.toBe(before)
  })

  test('changes when final rsc bundle content changes', () => {
    const manager = createFinalizedManager()
    const before = manager.getCompatibilityVersion()

    manager.bundles.rsc = createBundle({
      'index.js': 'export const root = "new-rsc"',
    })
    manager.finalizeCompatibilityManifest()

    expect(manager.getCompatibilityVersion()).not.toBe(before)
  })

  test('changes when server action encryption key identity changes', () => {
    const manager = createFinalizedManager()
    manager.serverActionEncryptionKeyHash = 'key-a'
    manager.finalizeCompatibilityManifest()
    const before = manager.getCompatibilityVersion()

    manager.serverActionEncryptionKeyHash = 'key-b'
    manager.finalizeCompatibilityManifest()

    expect(manager.getCompatibilityVersion()).not.toBe(before)
  })

  test('is stable across different absolute roots', () => {
    const first = createFinalizedManager({ root: '/first/root' })
    first.clientReferenceMetaMap = {
      '/first/root/src/button.tsx': {
        importId: '/first/root/src/button.tsx',
        referenceKey: 'button',
        exportNames: ['Button'],
        renderedExports: ['Button'],
      },
    }
    first.finalizeCompatibilityManifest()

    const second = createFinalizedManager({ root: '/second/root' })
    second.clientReferenceMetaMap = {
      '/second/root/src/button.tsx': {
        importId: '/second/root/src/button.tsx',
        referenceKey: 'button',
        exportNames: ['Button'],
        renderedExports: ['Button'],
      },
    }
    second.finalizeCompatibilityManifest()

    expect(second.getCompatibilityVersion()).toBe(
      first.getCompatibilityVersion(),
    )
  })
})

type ManagerOptions = {
  base?: string
  root?: string
}

function createFinalizedManager(options: ManagerOptions = {}) {
  const manager = createManager(options)
  manager.clientReferenceMetaMap = {
    [`${options.root ?? '/workspace/app'}/src/button.tsx`]: {
      importId: `${options.root ?? '/workspace/app'}/src/button.tsx`,
      referenceKey: 'button',
      exportNames: ['Button'],
      renderedExports: ['Button'],
    },
  }
  manager.serverReferenceMetaMap = {
    [`${options.root ?? '/workspace/app'}/src/actions.ts`]: {
      importId: `${options.root ?? '/workspace/app'}/src/actions.ts`,
      referenceKey: 'actions',
      exportNames: ['save'],
    },
  }
  manager.buildAssetsManifest = {
    bootstrapScriptContent: 'import("/assets/index.js")',
    clientReferenceDeps: {
      button: {
        js: ['/assets/button.js'],
        css: [],
      },
    },
  }
  manager.bundles = {
    client: createBundle({
      'assets/button.js': 'export const Button = "old"',
    }),
    rsc: createBundle({
      'index.js': 'export const root = "rsc"',
    }),
  }
  manager.finalizeCompatibilityManifest()
  return manager
}

function createManager({
  base = '/',
  root = '/workspace/app',
}: ManagerOptions = {}) {
  const [plugin] = vitePluginRscMinimal()
  const manager = (plugin as { api: PluginApi }).api.manager
  manager.config = { base, command: 'build', root } as any
  return manager
}

function createBundle(chunks: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(chunks).map(([fileName, code]) => [
      fileName,
      {
        type: 'chunk',
        fileName,
        code,
      },
    ]),
  ) as any
}
