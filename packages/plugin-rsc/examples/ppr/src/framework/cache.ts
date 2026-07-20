import {
  createClientTemporaryReferenceSet,
  createFromReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  encodeReply,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import type React from 'react'

export type CacheData = Record<string, string>

const entries = new Map<string, Promise<Uint8Array>>()
let nextComponentId = 0

export function createCachedComponent<Props extends object>(
  Component: (props: Props) => React.ReactNode | Promise<React.ReactNode>,
): (props: Props) => Promise<React.ReactNode> {
  const componentId = String(nextComponentId++)

  return async function CachedComponent(props: Props) {
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
