import * as ReactDOM from 'react-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { preloadClientReferenceDeps } from './ssr-resources'

vi.mock('react-dom', () => ({
  preloadModule: vi.fn(),
  preinit: vi.fn(),
}))

describe(preloadClientReferenceDeps, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('preloads client reference JavaScript with low priority', () => {
    preloadClientReferenceDeps(
      {
        js: ['/assets/client.js', '/assets/shared.js'],
        css: [],
      },
      [],
      true,
    )

    expect(ReactDOM.preloadModule).toHaveBeenCalledTimes(2)
    expect(ReactDOM.preloadModule).toHaveBeenNthCalledWith(
      1,
      '/assets/client.js',
      {
        as: 'script',
        crossOrigin: '',
        fetchPriority: 'low',
      },
    )
    expect(ReactDOM.preloadModule).toHaveBeenNthCalledWith(
      2,
      '/assets/shared.js',
      {
        as: 'script',
        crossOrigin: '',
        fetchPriority: 'low',
      },
    )
  })

  test('preserves default priority for client entry dependencies', () => {
    preloadClientReferenceDeps(
      {
        js: [
          '/assets/client.js',
          '/assets/entry.js',
          '/assets/entry-shared.js',
        ],
        css: [],
      },
      ['/assets/entry.js', '/assets/entry-shared.js'],
      true,
    )

    expect(ReactDOM.preloadModule).toHaveBeenNthCalledWith(
      1,
      '/assets/client.js',
      {
        as: 'script',
        crossOrigin: '',
        fetchPriority: 'low',
      },
    )
    expect(ReactDOM.preloadModule).toHaveBeenNthCalledWith(
      2,
      '/assets/entry.js',
      {
        as: 'script',
        crossOrigin: '',
      },
    )
    expect(ReactDOM.preloadModule).toHaveBeenNthCalledWith(
      3,
      '/assets/entry-shared.js',
      {
        as: 'script',
        crossOrigin: '',
      },
    )
  })

  test('preserves default priority when a reference only uses entry dependencies', () => {
    preloadClientReferenceDeps(
      {
        js: ['/assets/entry.js', '/assets/entry-shared.js'],
        css: [],
      },
      ['/assets/entry.js', '/assets/entry-shared.js'],
      true,
    )

    expect(ReactDOM.preloadModule).toHaveBeenCalledTimes(2)
    expect(ReactDOM.preloadModule).toHaveBeenNthCalledWith(
      1,
      '/assets/entry.js',
      {
        as: 'script',
        crossOrigin: '',
      },
    )
    expect(ReactDOM.preloadModule).toHaveBeenNthCalledWith(
      2,
      '/assets/entry-shared.js',
      {
        as: 'script',
        crossOrigin: '',
      },
    )
  })

  test('keeps client reference CSS render blocking', () => {
    preloadClientReferenceDeps(
      {
        js: [],
        css: ['/assets/client.css'],
      },
      [],
      true,
    )

    expect(ReactDOM.preinit).toHaveBeenCalledWith('/assets/client.css', {
      as: 'style',
      precedence: 'vite-rsc/client-reference',
    })
  })

  test('supports disabling CSS link precedence without changing JS priority', () => {
    preloadClientReferenceDeps(
      {
        js: ['/assets/client.js'],
        css: ['/assets/client.css'],
      },
      [],
      false,
    )

    expect(ReactDOM.preloadModule).toHaveBeenCalledWith('/assets/client.js', {
      as: 'script',
      crossOrigin: '',
      fetchPriority: 'low',
    })
    expect(ReactDOM.preinit).toHaveBeenCalledWith('/assets/client.css', {
      as: 'style',
      precedence: undefined,
    })
  })
})
