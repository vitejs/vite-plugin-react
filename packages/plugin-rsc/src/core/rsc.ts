import { memoize, tinyassert } from '@hiogawa/utils'
import type { BundlerConfig, ImportManifestEntry, ModuleMap } from '../types'
import {
  SERVER_DECODE_CLIENT_PREFIX,
  SERVER_REFERENCE_PREFIX,
  createReferenceCacheTag,
  removeReferenceCacheTag,
  setInternalRequire,
} from './shared'
import * as ReactServer from '@vitejs/plugin-rsc/vendor/react-server-dom/server.edge'

// @ts-expect-error Import polyfill

let init = false
let requireModule!: (id: string) => unknown

export function setRequireModule(options: {
  load: (id: string) => unknown
}): void {
  if (init) return
  init = true

  requireModule = (id) => {
    return options.load(removeReferenceCacheTag(id))
  }

  // need memoize to return stable promise from __webpack_require__
  ;(globalThis as any).__vite_rsc_server_require__ = memoize(
    async (id: string) => {
      if (id.startsWith(SERVER_DECODE_CLIENT_PREFIX)) {
        id = id.slice(SERVER_DECODE_CLIENT_PREFIX.length)
        id = removeReferenceCacheTag(id)
        // create `registerClientReference` on the fly since there's no way to
        // grab the original client reference module on ther server.
        // cf. https://github.com/lazarv/react-server/blob/79e7acebc6f4a8c930ad8422e2a4a9fdacfcce9b/packages/react-server/server/module-loader.mjs#L19
        // decode client reference on the server
        return new Proxy({} as any, {
          get(target, name, _receiver) {
            if (typeof name !== 'string' || name === 'then') return
            return (target[name] ??= ReactServer.registerClientReference(
              () => {
                throw new Error(
                  `Unexpectedly client reference export '${name}' is called on server`,
                )
              },
              id,
              name,
            ))
          },
        })
      }
      return requireModule(id)
    },
  )

  setInternalRequire()
}

export async function loadServerAction(
  id: string,
): Promise<(...args: any[]) => any> {
  const [file, name] = id.split('#') as [string, string]
  const mod: any = await requireModule(file)
  return mod[name]
}

export function createServerManifest(): BundlerConfig {
  const cacheTag = import.meta.env.DEV ? createReferenceCacheTag() : ''

  return new Proxy(
    {},
    {
      get(_target, $$id, _receiver) {
        tinyassert(typeof $$id === 'string')
        const [id, name] = $$id.split('#')
        tinyassert(id)
        tinyassert(name)
        return {
          id: SERVER_REFERENCE_PREFIX + id + cacheTag,
          name,
          chunks: [],
          async: true,
        } satisfies ImportManifestEntry
      },
    },
  )
}

export function createServerDecodeClientManifest(): ModuleMap {
  return new Proxy(
    {},
    {
      get(_target, id: string) {
        return new Proxy(
          {},
          {
            get(_target, name: string) {
              return {
                id: SERVER_REFERENCE_PREFIX + SERVER_DECODE_CLIENT_PREFIX + id,
                name,
                chunks: [],
                async: true,
              }
            },
          },
        )
      },
    },
  )
}

export function createClientManifest(): BundlerConfig {
  const cacheTag = import.meta.env.DEV ? createReferenceCacheTag() : ''

  return new Proxy(
    {},
    {
      get(_target, $$id, _receiver) {
        tinyassert(typeof $$id === 'string')
        const [id, name] = $$id.split('#')
        tinyassert(id)
        tinyassert(name)
        return {
          id: id + cacheTag,
          name,
          chunks: [],
          async: true,
        } satisfies ImportManifestEntry
      },
    },
  )
}
