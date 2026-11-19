import { describe, expect, it, vi } from 'vitest'
import { createReferenceCacheTag, memoizeReferenceRequire } from './shared'

describe(memoizeReferenceRequire, () => {
  function setup() {
    let loads = 0
    const load = vi.fn((id: string) => Promise.resolve({ id, load: ++loads }))
    return { load, requireModule: memoizeReferenceRequire(load) }
  }

  it('returns the same promise for an id without a tag', () => {
    const { load, requireModule } = setup()
    expect(requireModule('/a.js')).toBe(requireModule('/a.js'))
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('returns the same promise for the same tag and loads again for a newer one', () => {
    const { load, requireModule } = setup()
    const first = createReferenceCacheTag()
    const second = createReferenceCacheTag()
    const promise = requireModule('/a.js' + first)
    expect(requireModule('/a.js' + first)).toBe(promise)
    expect(requireModule('/a.js' + second)).not.toBe(promise)
    expect(load).toHaveBeenCalledTimes(2)
    expect(load).toHaveBeenLastCalledWith('/a.js' + second)
  })

  it('keeps an older render reading its own load after a newer one', async () => {
    const error = new Error('boom')
    const load = vi
      .fn<(id: string) => Promise<unknown>>()
      .mockResolvedValueOnce({ load: 1 })
      .mockRejectedValueOnce(error)
    const requireModule = memoizeReferenceRequire(load)
    const first = createReferenceCacheTag()
    const second = createReferenceCacheTag()
    const firstPromise = requireModule('/a.js' + first)
    const secondPromise = requireModule('/a.js' + second)
    await firstPromise
    await expect(secondPromise).rejects.toBe(error)
    expect(requireModule('/a.js' + first)).toBe(firstPromise)
    expect(firstPromise).toMatchObject({
      status: 'fulfilled',
      value: { load: 1 },
    })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('gives a tag older than the latest ones the last fulfilled load', async () => {
    const error = new Error('boom')
    const load = vi.fn((id: string) =>
      id.includes(last) ? Promise.reject(error) : Promise.resolve({ id }),
    )
    const requireModule = memoizeReferenceRequire(load)
    const oldest = createReferenceCacheTag()
    const tags = Array.from({ length: 16 }, () => createReferenceCacheTag())
    const last = tags.at(-1)!
    const promises = tags.map((tag) => requireModule('/a.js' + tag))
    await Promise.allSettled(promises)
    expect(load).toHaveBeenCalledTimes(16)

    // the newest load rejected, so the one before it is the fallback.
    expect(requireModule('/a.js' + oldest)).toBe(promises.at(-2))
    expect(load).toHaveBeenCalledTimes(16)
  })

  it('keeps an older render reading a module it loads first', async () => {
    const { load, requireModule } = setup()
    const first = createReferenceCacheTag()
    const second = createReferenceCacheTag()
    requireModule('/a.js' + second)
    const promise = requireModule('/b.js' + first)
    await promise
    expect(requireModule('/b.js' + first)).toBe(promise)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('tracks a rejected load', async () => {
    const error = new Error('boom')
    const requireModule = memoizeReferenceRequire(() => Promise.reject(error))
    const promise = requireModule('/a.js' + createReferenceCacheTag())
    await expect(promise).rejects.toBe(error)
    expect(promise).toMatchObject({ status: 'rejected', reason: error })
  })
})
