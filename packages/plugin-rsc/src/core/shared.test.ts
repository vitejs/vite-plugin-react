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

  it('gives an older tag the last settled load, with its state', async () => {
    const { load, requireModule } = setup()
    const first = createReferenceCacheTag()
    const second = createReferenceCacheTag()
    const third = createReferenceCacheTag()
    const firstPromise = requireModule('/a.js' + first)
    await firstPromise
    expect(firstPromise).toMatchObject({
      status: 'fulfilled',
      value: { load: 1 },
    })

    // a newer render's load hasn't settled: the older render keeps its own.
    const thirdPromise = requireModule('/a.js' + third)
    expect(requireModule('/a.js' + first)).toBe(firstPromise)
    expect(requireModule('/a.js' + second)).toBe(firstPromise)

    // once it has, an older render gets the newer module.
    await thirdPromise
    expect(requireModule('/a.js' + first)).toBe(thirdPromise)
    expect(load).toHaveBeenCalledTimes(2)
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
