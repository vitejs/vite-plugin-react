import {
  createClientTemporaryReferenceSet,
  createFromReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  encodeReply,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import type React from 'react'
import { trackPrerenderWork } from './prerender-context'
import {
  arrayToStream,
  concatArrayStream,
  fromBase64,
  toBase64,
} from './stream-utils'

export type CacheData = Record<string, string>

const entries = new Map<string, Promise<Uint8Array>>()
let nextComponentId = 0

/**
 * Marks a component as cacheable. Its props form the cache key, and its RSC
 * result is serialized for reuse across prerender and request renders.
 * Cache misses are tracked so prerender waits for them before cutting off.
 */
export function createCachedComponent<Props extends object>(
  Component: (props: Props) => React.ReactNode,
): (props: Props) => Promise<React.ReactNode> {
  // Registration order is stable within the same production build. In dev,
  // reevaluating callers allocates new IDs and naturally invalidates old entries.
  // A production framework would use a compiler-generated source identity plus
  // a build or HMR revision instead.
  const componentId = String(nextComponentId++)

  // Cache serialization is based on the existing use-cache runtime example:
  // cf. todo examples/basic/cache-runtime
  // https://github.com/vercel/next.js/pull/70435
  // https://github.com/vercel/next.js/blob/09a2167b0a970757606b7f91ff2d470f77f13f8c/packages/next/src/server/use-cache/use-cache-wrapper.ts

  async function CachedComponent(props: Props): Promise<React.ReactNode> {
    const clientTemporaryReferences = createClientTemporaryReferenceSet()
    const encodedArgs = await encodeReply([props], {
      temporaryReferences: clientTemporaryReferences,
    })
    const key = componentId + ':' + (await replyToCacheKey(encodedArgs))

    let entry = entries.get(key)
    if (!entry) {
      entry = (async () => {
        const temporaryReferences = createTemporaryReferenceSet()
        const [decodedProps] = (await decodeReply(encodedArgs, {
          temporaryReferences,
        })) as [Props]
        const result = await Component(decodedProps)
        const stream = renderToReadableStream(result, {
          environmentName: 'Cache',
          temporaryReferences,
        })
        // examples/basic's StreamCacher and Next.js keep this stream lazy. This
        // demo materializes it so the entry promise also tracks cache-fill
        // completion without a separate readiness signal.
        // TODO: Follow up with a stream-native cache and a separate,
        // CacheSignal-like completion signal.
        // https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/use-cache/use-cache-wrapper.ts#L1495-L1519
        return concatArrayStream(stream)
      })()
      entries.set(key, entry)
    }

    return createFromReadableStream<React.ReactNode>(
      arrayToStream(await entry),
      {
        environmentName: 'Cache',
        replayConsoleLogs: true,
        temporaryReferences: clientTemporaryReferences,
      },
    )
  }

  // Tracking the entry promise makes cache-fill completion this demo's
  // readiness signal. Production frameworks track equivalent work separately
  // so cached streams can remain lazy.
  // https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/app-render.tsx#L7943-L7974
  // https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/app-render.tsx#L8076-L8080
  // https://github.com/cloudflare/vinext/blob/fd1cc3d3ddaaec8c130d5e4bcae3a6f761089756/packages/vinext/src/shims/ppr-fallback-shell.ts#L170-L200
  return function TrackedCachedComponent(props: Props) {
    return trackPrerenderWork(CachedComponent(props))
  }
}

export async function exportCache(): Promise<CacheData> {
  return Object.fromEntries(
    await Promise.all(
      [...entries].map(async ([key, value]) => [key, toBase64(await value)]),
    ),
  )
}

export function importCache(data: CacheData): void {
  for (const [key, value] of Object.entries(data)) {
    entries.set(key, Promise.resolve(fromBase64(value)))
  }
}

async function replyToCacheKey(reply: string | FormData): Promise<string> {
  if (typeof reply === 'string') {
    return reply
  }
  const digest = await crypto.subtle.digest(
    'SHA-256',
    await new Response(reply).arrayBuffer(),
  )
  return toBase64(new Uint8Array(digest))
}
