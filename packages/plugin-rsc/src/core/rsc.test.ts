import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@vitejs/plugin-rsc/vendor/react-server-dom/server.edge', () => ({
  registerClientReference: vi.fn(),
  registerServerReference(reference: Function, id: string, name: string) {
    return Object.defineProperties(reference, {
      $$typeof: { value: Symbol.for('react.server.reference') },
      $$id: { value: `${id}#${name}` },
      $$bound: { value: null, writable: true },
    })
  },
}))

const { createServerManifest, setRequireModule } = await import('./rsc')

beforeAll(() => {
  setRequireModule({
    load() {
      throw new Error('preserved references must not load their implementation')
    },
  })
})

describe('createServerManifest', () => {
  it('preserves server references without loading their implementation', async () => {
    const manifest = createServerManifest({ preserveServerReferences: true })
    const entry = manifest['module-id#action']!
    expect(entry.id).toContain('$$decode-server-reference:module-id')

    const module = await (globalThis as any).__vite_rsc_require__(entry.id)
    expect(Object.prototype.hasOwnProperty.call(module, 'action')).toBe(true)
    const reference = module.action
    expect(reference.$$typeof).toBe(Symbol.for('react.server.reference'))
    expect(reference.$$id).toBe('module-id#action')
    expect(reference.$$bound).toBeNull()
  })
})
