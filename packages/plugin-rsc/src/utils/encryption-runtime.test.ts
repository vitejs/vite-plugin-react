import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  clientModuleLoaded: vi.fn(),
  createFromReadableStream: vi.fn(),
}))

vi.mock('virtual:vite-rsc/encryption-key', () => ({
  default: vi.fn().mockResolvedValue('AAAAAAAAAAAAAAAAAAAAAA=='),
}))

vi.mock('../react/rsc/server', () => ({
  renderToReadableStream: vi.fn(),
}))

vi.mock('../react/rsc/client', () => {
  mocks.clientModuleLoaded()
  return {
    createFromReadableStream: mocks.createFromReadableStream,
  }
})

vi.mock('./encryption-utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./encryption-utils')>()),
  decryptBuffer: vi.fn().mockResolvedValue(new Uint8Array()),
}))

describe('encryption runtime', () => {
  test('loads the RSC client only when decrypting bound arguments', async () => {
    const { decryptActionBoundArgs } = await import('./encryption-runtime')

    expect(mocks.clientModuleLoaded).not.toHaveBeenCalled()

    await decryptActionBoundArgs(Promise.resolve('encrypted'))

    expect(mocks.clientModuleLoaded).toHaveBeenCalledOnce()
    expect(mocks.createFromReadableStream).toHaveBeenCalledOnce()
  })
})
