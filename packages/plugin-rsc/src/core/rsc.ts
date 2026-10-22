import type { AsyncLocalStorage } from 'node:async_hooks'
import type { BundlerConfig, ImportManifestEntry, ModuleMap } from '../types'
import { memoize, tinyassert } from '../utils/shared'
import {
  SERVER_DECODE_CLIENT_PREFIX,
  SERVER_REFERENCE_PRESERVE_PREFIX,
  SERVER_REFERENCE_PREFIX,
  createReferenceCacheTag,
  removeReferenceCacheTag,
  setInternalRequire,
} from './shared'

// @ts-ignore
import * as ReactServer from '@vitejs/plugin-rsc/vendor/react-server-dom/server.edge'

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
      if (id.startsWith(SERVER_REFERENCE_PRESERVE_PREFIX)) {
        id = id.slice(SERVER_REFERENCE_PRESERVE_PREFIX.length)
        id = removeReferenceCacheTag(id)
        const target = {} as any
        const getOrCreateServerReference = (name: string) => {
          return (target[name] ??= ReactServer.registerServerReference(
            () => {
              throw new Error(
                `Unexpectedly decoded server reference '${id}#${name}' is called on server`,
              )
            },
            id,
            name,
          ))
        }
        return new Proxy(target, {
          getOwnPropertyDescriptor(_target, name) {
            if (typeof name !== 'string' || name === 'then') {
              return Reflect.getOwnPropertyDescriptor(target, name)
            }
            getOrCreateServerReference(name)
            return Reflect.getOwnPropertyDescriptor(target, name)
          },
        })
      }
      if (id.startsWith(SERVER_DECODE_CLIENT_PREFIX)) {
        // decode client reference on the server
        id = id.slice(SERVER_DECODE_CLIENT_PREFIX.length)
        id = removeReferenceCacheTag(id)
        // create `registerClientReference` on the fly since there's no way to
        // grab the original client reference module on ther server.
        // cf. https://github.com/lazarv/react-server/blob/79e7acebc6f4a8c930ad8422e2a4a9fdacfcce9b/packages/react-server/server/module-loader.mjs#L19
        const target = {} as any
        const getOrCreateClientReference = (name: string) => {
          return (target[name] ??= ReactServer.registerClientReference(
            () => {
              throw new Error(
                `Unexpectedly client reference export '${name}' is called on server`,
              )
            },
            id,
            name,
          ))
        }
        return new Proxy(target, {
          // React 19.2.1+ uses hasOwnProperty.call() to check for exports
          // https://github.com/facebook/react/pull/35277
          getOwnPropertyDescriptor(_target, name) {
            if (typeof name !== 'string' || name === 'then') {
              return Reflect.getOwnPropertyDescriptor(target, name)
            }
            getOrCreateClientReference(name)
            return Reflect.getOwnPropertyDescriptor(target, name)
          },
        })
      }
      return requireModule(id)
    },
  )

  setInternalRequire()
}

export async function loadServerAction(id: string): Promise<Function> {
  const [file, name] = id.split('#') as [string, string]
  const mod: any = await requireModule(file)
  return mod[name]
}

export function createServerManifest(
  options?: CreateServerManifestOptions & {
    preserveServerReferences?: boolean
  },
): BundlerConfig {
  const prefix = options?.preserveServerReferences
    ? SERVER_REFERENCE_PRESERVE_PREFIX
    : ''
  const cacheTag = import.meta.env.DEV ? createReferenceCacheTag() : ''

  return new Proxy(
    {},
    {
      get(_target, $$id, _receiver) {
        tinyassert(typeof $$id === 'string')
        let [id, name] = $$id.split('#')
        tinyassert(id)
        tinyassert(name)
        options?.onServerReference?.({ id, name })
        return {
          id: SERVER_REFERENCE_PREFIX + prefix + id + cacheTag,
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

export function createClientManifest(
  options?: CreateClientManifestOptions,
): BundlerConfig {
  const cacheTag = import.meta.env.DEV ? createReferenceCacheTag() : ''

  return new Proxy(
    {},
    {
      get(_target, $$id, _receiver) {
        tinyassert(typeof $$id === 'string')
        let [id, name] = $$id.split('#')
        tinyassert(id)
        tinyassert(name)
        options?.onClientReference?.({ id, name })
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

export interface ClientReferenceMetadata {
  id: string
  name: string
}

export interface CreateClientManifestOptions {
  onClientReference?: (metadata: ClientReferenceMetadata) => void
}

export interface ServerReferenceMetadata {
  id: string
  name: string
}

export interface CreateServerManifestOptions {
  /**
   * Called for each server reference React resolves while decoding.
   * Throw to reject the reference before its module loads.
   * @experimental
   */
  onServerReference?: (metadata: ServerReferenceMetadata) => void
}

export interface ResourceRenderOptions {
  /**
   * CSP nonce for the stylesheet links of server components' CSS.
   */
  nonce?: string
}

type ResourceRenderOptionsStorage = AsyncLocalStorage<ResourceRenderOptions>

// per-render options read by `Resources` while React renders it. This uses the
// global `AsyncLocalStorage` that `rsc:inject-async-local-storage` sets up for
// React, read lazily so that this module isn't itself a target of the injection.
let resourceRenderOptionsStorage: ResourceRenderOptionsStorage | undefined

function getResourceRenderOptionsStorage():
  | ResourceRenderOptionsStorage
  | undefined {
  const AsyncLocalStorageClass: typeof AsyncLocalStorage | undefined = (
    globalThis as any
  ).AsyncLocalStorage
  if (AsyncLocalStorageClass) {
    resourceRenderOptionsStorage ??= new AsyncLocalStorageClass()
  }
  return resourceRenderOptionsStorage
}

// a render always runs with its own options, so a nested render without a
// nonce (e.g. one whose output is cached across requests) doesn't inherit one.
export function runWithResourceRenderOptions<T>(
  options: ResourceRenderOptions,
  fn: () => T,
): T {
  const storage = getResourceRenderOptionsStorage()
  return storage ? storage.run(options, fn) : fn()
}

export function getResourceRenderOptions(): ResourceRenderOptions | undefined {
  return getResourceRenderOptionsStorage()?.getStore()
}
