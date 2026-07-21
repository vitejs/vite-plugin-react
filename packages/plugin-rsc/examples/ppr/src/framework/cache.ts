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

// Cache serialization is based on the existing use-cache runtime example:
// https://github.com/vercel/next.js/pull/70435
// https://github.com/vercel/next.js/blob/09a2167b0a970757606b7f91ff2d470f77f13f8c/packages/next/src/server/use-cache/use-cache-wrapper.ts
// TODO: Contrast the minimal `trackPrerenderWork` integration with production
// cache readiness tracking in Next.js and vinext.
// https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/app-render.tsx#L7943-L7974
// https://github.com/vercel/next.js/blob/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/packages/next/src/server/app-render/app-render.tsx#L8076-L8080
// https://github.com/cloudflare/vinext/blob/fd1cc3d3ddaaec8c130d5e4bcae3a6f761089756/packages/vinext/src/shims/ppr-fallback-shell.ts#L170-L200

export type CacheData = Record<string, string>

const entries = new Map<string, Promise<Uint8Array>>()
let nextComponentId = 0

/**
 * Marks a component as cacheable. Its props form the cache key, and its RSC
 * result is serialized for reuse across prerender and request renders.
 * Cache misses are tracked so prerender waits for them before cutting off.
 */
export function createCachedComponent<Props extends object>(
  Component: (props: Props) => React.ReactNode | Promise<React.ReactNode>,
): (props: Props) => Promise<React.ReactNode> {
  const componentId = String(nextComponentId++)

  return function CachedComponent(props: Props) {
    return trackPrerenderWork(
      (async () => {
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
            return new Uint8Array(
              await new Response(
                renderToReadableStream(result, {
                  environmentName: 'Cache',
                  temporaryReferences,
                }),
              ).arrayBuffer(),
            )
          })()
          entries.set(key, entry)
        }

        return createFromReadableStream(bytesToStream(await entry), {
          environmentName: 'Cache',
          replayConsoleLogs: true,
          temporaryReferences: clientTemporaryReferences,
        })
      })(),
    )
  }
}

export async function exportCache(): Promise<CacheData> {
  return Object.fromEntries(
    await Promise.all(
      [...entries].map(async ([key, value]) => [
        key,
        bytesToBase64(await value),
      ]),
    ),
  )
}

export function importCache(data: CacheData): void {
  for (const [key, value] of Object.entries(data)) {
    entries.set(key, Promise.resolve(base64ToBytes(value)))
  }
}

function bytesToStream(data: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(data)
      controller.close()
    },
  })
}

async function replyToCacheKey(reply: string | FormData): Promise<string> {
  if (typeof reply === 'string') return reply
  const digest = await crypto.subtle.digest(
    'SHA-256',
    await new Response(reply).arrayBuffer(),
  )
  return bytesToBase64(new Uint8Array(digest))
}

function bytesToBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
}

function base64ToBytes(data: string): Uint8Array {
  return Uint8Array.from(atob(data), (character) => character.charCodeAt(0))
}
