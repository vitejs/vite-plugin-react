import { describe, expect, it } from 'vitest'

// Extract the validateImportPlugin function for testing
function validateImportPlugin() {
  let isScanBuild = false

  return {
    name: 'rsc:validate-imports',
    enforce: 'pre' as const,
    resolveId(source: string, importer?: string, options?: { scan?: boolean }) {
      // skip validation during optimizeDeps scan since for now
      // we want to allow going through server/client boundary loosely
      if (isScanBuild || (options && 'scan' in options && options.scan)) {
        return
      }

      // Validate client-only imports in server environments
      if (
        source === 'client-only' &&
        (this.environment.name === 'rsc' || this.environment.name === 'ssr')
      ) {
        throw new Error(
          `'client-only' is included in server build (importer: ${importer ?? 'unknown'})`,
        )
      }

      // Validate server-only imports in client environment
      if (source === 'server-only' && this.environment.name === 'client') {
        throw new Error(
          `'server-only' is included in client build (importer: ${importer ?? 'unknown'})`,
        )
      }

      return
    },
  }
}

describe('validateImportPlugin', () => {
  it('should allow client-only imports in client environment', () => {
    const plugin = validateImportPlugin()
    const context = { environment: { name: 'client' } }

    expect(() =>
      plugin.resolveId.call(context, 'client-only', 'test.tsx', {}),
    ).not.toThrow()
  })

  it('should allow server-only imports in rsc environment', () => {
    const plugin = validateImportPlugin()
    const context = { environment: { name: 'rsc' } }

    expect(() =>
      plugin.resolveId.call(context, 'server-only', 'test.tsx', {}),
    ).not.toThrow()
  })

  it('should allow server-only imports in ssr environment', () => {
    const plugin = validateImportPlugin()
    const context = { environment: { name: 'ssr' } }

    expect(() =>
      plugin.resolveId.call(context, 'server-only', 'test.tsx', {}),
    ).not.toThrow()
  })

  it('should allow non-restricted imports in any environment', () => {
    const plugin = validateImportPlugin()
    const clientContext = { environment: { name: 'client' } }
    const rscContext = { environment: { name: 'rsc' } }
    const ssrContext = { environment: { name: 'ssr' } }

    expect(() =>
      plugin.resolveId.call(clientContext, 'react', 'test.tsx', {}),
    ).not.toThrow()

    expect(() =>
      plugin.resolveId.call(rscContext, 'react', 'test.tsx', {}),
    ).not.toThrow()

    expect(() =>
      plugin.resolveId.call(ssrContext, 'react', 'test.tsx', {}),
    ).not.toThrow()
  })

  it('should block client-only imports in rsc environment', () => {
    const plugin = validateImportPlugin()
    const context = { environment: { name: 'rsc' } }

    expect(() =>
      plugin.resolveId.call(context, 'client-only', 'test.tsx', {}),
    ).toThrow("'client-only' is included in server build (importer: test.tsx)")
  })

  it('should block client-only imports in ssr environment', () => {
    const plugin = validateImportPlugin()
    const context = { environment: { name: 'ssr' } }

    expect(() =>
      plugin.resolveId.call(context, 'client-only', 'test.tsx', {}),
    ).toThrow("'client-only' is included in server build (importer: test.tsx)")
  })

  it('should block server-only imports in client environment', () => {
    const plugin = validateImportPlugin()
    const context = { environment: { name: 'client' } }

    expect(() =>
      plugin.resolveId.call(context, 'server-only', 'test.tsx', {}),
    ).toThrow("'server-only' is included in client build (importer: test.tsx)")
  })

  it('should skip validation during scan mode', () => {
    const plugin = validateImportPlugin()
    const clientContext = { environment: { name: 'client' } }
    const rscContext = { environment: { name: 'rsc' } }

    // These should not throw even though they would normally be invalid
    expect(() =>
      plugin.resolveId.call(clientContext, 'server-only', 'test.tsx', {
        scan: true,
      }),
    ).not.toThrow()

    expect(() =>
      plugin.resolveId.call(rscContext, 'client-only', 'test.tsx', {
        scan: true,
      }),
    ).not.toThrow()
  })

  it('should handle missing importer gracefully', () => {
    const plugin = validateImportPlugin()
    const context = { environment: { name: 'client' } }

    expect(() =>
      plugin.resolveId.call(context, 'server-only', undefined, {}),
    ).toThrow("'server-only' is included in client build (importer: unknown)")
  })
})
