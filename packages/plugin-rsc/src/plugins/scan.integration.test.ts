import path from 'node:path'
import type { ExportSpecifier, ImportSpecifier } from 'es-module-lexer'
import { build } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import type { RscPluginManager } from '../plugin'
import { scanBuildStripPlugin } from './scan'

const root = path.join(import.meta.dirname, 'fixtures/scan-observer')

describe(scanBuildStripPlugin, () => {
  it('does not notify observers outside scan builds', async () => {
    const observer = vi.fn()
    const manager = {
      isScanBuild: false,
      scanBuildObservers: new Set([observer]),
    } as unknown as RscPluginManager

    await build({
      root,
      logLevel: 'silent',
      build: {
        write: false,
        rollupOptions: { input: path.join(root, 'entry.js') },
      },
      plugins: [scanBuildStripPlugin({ manager })],
    })

    expect(observer).not.toHaveBeenCalled()
  })

  it('emits ordered reset and module events with raw scan metadata', async () => {
    const observer = vi.fn()
    const secondObserver = vi.fn()
    const manager = {
      isScanBuild: true,
      scanBuildObservers: new Set([observer, secondObserver]),
    } as unknown as RscPluginManager

    await build({
      root,
      logLevel: 'silent',
      build: {
        write: false,
        rollupOptions: { input: path.join(root, 'entry.js') },
      },
      plugins: [scanBuildStripPlugin({ manager })],
    })

    expect(secondObserver.mock.calls).toEqual(observer.mock.calls)
    expect(observer.mock.calls[0]![0]).toEqual({
      type: 'reset',
      environmentName: 'client',
    })

    const moduleEvents = observer.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === 'module')
    expect(moduleEvents).toHaveLength(2)

    const entryEvent = moduleEvents.find((event) =>
      event.info.id.endsWith('/entry.js'),
    )
    expect(entryEvent).toMatchObject({
      type: 'module',
      environmentName: 'client',
      code: expect.stringContaining("import { action } from './actions.js'"),
      info: {
        id: expect.stringMatching(/\/entry\.js$/),
        importedIds: [expect.stringMatching(/\/actions\.js$/)],
      },
    })
    expect(entryEvent.imports.map((item: ImportSpecifier) => item.n)).toEqual([
      './actions.js',
      './actions.js',
    ])
    expect(entryEvent.exports.map((item: ExportSpecifier) => item.n)).toEqual([
      'submit',
    ])

    const actionsEvent = moduleEvents.find((event) =>
      event.info.id.endsWith('/actions.js'),
    )
    expect(actionsEvent).toMatchObject({
      type: 'module',
      environmentName: 'client',
      code: 'export const action = 1\n',
      imports: [],
      exports: [expect.objectContaining({ n: 'action' })],
      info: {
        id: expect.stringMatching(/\/actions\.js$/),
        importedIds: [],
      },
    })
  })

  it('deduplicates module events across shared scan plugins', async () => {
    const observer = vi.fn()
    const manager = {
      isScanBuild: true,
      scanBuildObservers: new Set([observer]),
    } as unknown as RscPluginManager

    await build({
      root,
      logLevel: 'silent',
      build: {
        write: false,
        rollupOptions: { input: path.join(root, 'entry.js') },
      },
      plugins: [
        scanBuildStripPlugin({ manager }),
        scanBuildStripPlugin({ manager }),
      ],
    })

    const moduleIds = observer.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === 'module')
      .map((event) => path.basename(event.info.id))
      .sort()
    expect(moduleIds).toEqual(['actions.js', 'entry.js'])
  })
})
