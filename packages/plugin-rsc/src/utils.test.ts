import type { DevEnvironment } from 'vite'
import { describe, expect, it } from 'vitest'
import { hashString, normalizeViteImportAnalysisUrl } from './utils'

function createEnvironment(options?: {
  consumer?: 'client' | 'server'
  timestamp?: number
}) {
  return {
    config: {
      root: '/root',
      consumer: options?.consumer ?? 'server',
    },
    moduleGraph: {
      getModuleById: () =>
        options?.timestamp
          ? { lastHMRTimestamp: options.timestamp }
          : undefined,
    },
  } as unknown as DevEnvironment
}

describe(hashString, () => {
  it('returns a stable short sha256 hash', () => {
    expect(hashString('test')).toBe('9f86d081884c')
    expect(hashString('test')).toBe(hashString('test'))
    expect(hashString('other')).not.toBe(hashString('test'))
  })
})

describe(normalizeViteImportAnalysisUrl, () => {
  it('normalizes root files and virtual ids', () => {
    const environment = createEnvironment()
    expect(
      normalizeViteImportAnalysisUrl(environment, '/root/src/action.ts'),
    ).toBe('/src/action.ts')
    expect(normalizeViteImportAnalysisUrl(environment, 'virtual:action')).toBe(
      '/@id/virtual:action',
    )
  })

  it('injects HMR timestamps for client consumers or when requested', () => {
    const id = '/root/src/action.ts'
    expect(
      normalizeViteImportAnalysisUrl(
        createEnvironment({ consumer: 'client', timestamp: 123 }),
        id,
      ),
    ).toBe('/src/action.ts?t=123')
    expect(
      normalizeViteImportAnalysisUrl(
        createEnvironment({ timestamp: 456 }),
        id,
        { injectHMRTimestamp: true },
      ),
    ).toBe('/src/action.ts?t=456')
    expect(
      normalizeViteImportAnalysisUrl(createEnvironment({ timestamp: 789 }), id),
    ).toBe('/src/action.ts')
  })
})
