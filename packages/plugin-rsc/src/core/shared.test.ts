import { describe, expect, test, vi } from 'vitest'
import {
  REFERENCE_CACHE_TAG_LIMIT,
  createReferenceCacheTag,
  memoizeReferenceRequire,
} from './shared'

describe(memoizeReferenceRequire, () => {
  test('returns a stable value for the same tagged id', () => {
    const load = vi.fn((id: string) => ({ id }))
    const require = memoizeReferenceRequire(load)
    const tag = createReferenceCacheTag()
    const first = require('/src/client.tsx' + tag)
    expect(require('/src/client.tsx' + tag)).toBe(first)
    expect(load).toHaveBeenCalledTimes(1)
  })

  test('loads again under a new tag', () => {
    const load = vi.fn((id: string) => ({ id }))
    const require = memoizeReferenceRequire(load)
    const a = require('/src/client.tsx' + createReferenceCacheTag())
    const b = require('/src/client.tsx' + createReferenceCacheTag())
    expect(b).not.toBe(a)
    expect(load).toHaveBeenCalledTimes(2)
  })

  test('keeps untagged ids for good', () => {
    const load = vi.fn((id: string) => ({ id }))
    const require = memoizeReferenceRequire(load, 2)
    const first = require('/src/client.tsx')
    for (let i = 0; i < 10; i++) {
      require('/src/other.tsx' + createReferenceCacheTag())
    }
    expect(require('/src/client.tsx')).toBe(first)
    expect(load).toHaveBeenCalledWith('/src/client.tsx')
    expect(
      load.mock.calls.filter(([id]) => id === '/src/client.tsx'),
    ).toHaveLength(1)
  })

  test('forgets the least recently used tag beyond the limit', () => {
    const load = vi.fn((id: string) => ({ id }))
    const require = memoizeReferenceRequire(load, 2)
    const [a, b, c] = [1, 2, 3].map(() => createReferenceCacheTag())
    const fromA = require('/x' + a)
    require('/x' + b)
    require('/x' + c) // evicts a
    expect(require('/x' + a)).not.toBe(fromA)
  })

  test('a tag in use is not evicted by newer ones', () => {
    const load = vi.fn((id: string) => ({ id }))
    const require = memoizeReferenceRequire(load, 2)
    const [a, b, c] = [1, 2, 3].map(() => createReferenceCacheTag())
    const fromA = require('/x' + a)
    require('/x' + b)
    require('/y' + a) // touches a, so b is now the oldest
    require('/x' + c) // evicts b
    expect(require('/x' + a)).toBe(fromA)
  })

  // One tag per render in dev: what stays cached must not grow with renders.
  test('keeps exactly the most recent tags, however many it sees', () => {
    const load = vi.fn((id: string) => ({ id }))
    const require = memoizeReferenceRequire(load)
    const ids = Array.from(
      { length: REFERENCE_CACHE_TAG_LIMIT * 4 },
      () => '/src/client.tsx' + createReferenceCacheTag(),
    )
    for (const id of ids) require(id)
    load.mockClear()

    // the newest `limit` are answered from the cache...
    for (const id of ids.slice(-REFERENCE_CACHE_TAG_LIMIT).reverse()) {
      require(id)
    }
    expect(load).not.toHaveBeenCalled()
    // ...and anything older loads again
    require(ids[ids.length - REFERENCE_CACHE_TAG_LIMIT - 1]!)
    expect(load).toHaveBeenCalledTimes(1)
  })
})
