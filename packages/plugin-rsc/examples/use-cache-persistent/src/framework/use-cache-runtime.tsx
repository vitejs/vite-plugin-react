import { AsyncLocalStorage } from 'node:async_hooks'
import {
  createClientTemporaryReferenceSet,
  createFromReadableStream,
  encodeReply,
} from '@vitejs/plugin-rsc/rsc/client'
import {
  createTemporaryReferenceSet,
  decodeReply,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc/server'
import {
  decryptActionBoundArgs,
  encryptActionBoundArgs,
} from '@vitejs/plugin-rsc/utils/encryption-runtime'
import {
  getPersistentCache,
  resetPersistentCache,
  setPersistentCache,
} from './persistent-cache'

// based on
// https://github.com/vercel/next.js/pull/70435
// https://github.com/vercel/next.js/blob/09a2167b0a970757606b7f91ff2d470f77f13f8c/packages/next/src/server/use-cache/use-cache-wrapper.ts

export type CacheWrapperOptions = {
  argumentCount?: number
  cacheId: string
  generation?: string
}

const pendingEntries = new Map<string, Promise<Uint8Array>>()
const cacheExecutionEpoch = new AsyncLocalStorage<number>()
let cacheEpoch = 0
let resetPromise: Promise<void> | undefined

export default function cacheWrapper(
  fn: (...args: any[]) => Promise<unknown>,
  options: CacheWrapperOptions,
) {
  async function cachedFn(...args: any[]): Promise<unknown> {
    const inheritedEpoch = cacheExecutionEpoch.getStore()
    if (inheritedEpoch === undefined && resetPromise) await resetPromise
    const invocationEpoch = inheritedEpoch ?? cacheEpoch
    // Callers can supply more arguments than a cached function declares. For example,
    // `useActionState(fn)` passes state and form data even to `function fn() {}`.
    // Preserve the bound capture envelope, then strip extras from caller arguments
    // so they affect neither the cache key nor execution.
    // https://github.com/vercel/next.js/pull/72506
    const firstArgument = args[0]
    const captureEnvelope = isCacheCaptureEnvelope(firstArgument)
      ? firstArgument
      : undefined
    const admittedArgs =
      options.argumentCount === undefined
        ? args
        : captureEnvelope
          ? [captureEnvelope, ...args.slice(1, 1 + options.argumentCount)]
          : args.slice(0, options.argumentCount)
    // Serialize arguments to a cache key via `encodeReply` from `react-server-dom/client`.
    // NOTE: using `renderToReadableStream` here for arguments serialization would end up
    // serializing react elements (e.g. children props), which causes
    // those arguments to be included as a cache key and it doesn't achieve
    // "use cache static shell + dynamic children props" pattern.
    // cf. https://nextjs.org/docs/app/api-reference/directives/use-cache#non-serializable-arguments
    const clientTemporaryReferences = createClientTemporaryReferenceSet()
    let executionArguments = admittedArgs
    if (captureEnvelope) {
      // Decrypt in the framework runtime so cache identity and execution share
      // these values; the transformed implementation only destructures the array.
      const captures = await decryptCacheCaptures(captureEnvelope)
      const invocationArguments = admittedArgs.slice(1)
      executionArguments = [captures, ...invocationArguments]
    }
    const encodedArguments = await encodeReply(executionArguments, {
      temporaryReferences: clientTemporaryReferences,
    })
    const serializedCacheKey = await replyToCacheKey(encodedArguments)
    const cacheKey = JSON.stringify([
      options.cacheId,
      options.generation,
      serializedCacheKey,
    ])
    const pendingKey = JSON.stringify([invocationEpoch, cacheKey])

    let bytes = await getPersistentCache(cacheKey)
    if (!bytes) {
      let pending = pendingEntries.get(pendingKey)
      if (!pending) {
        pending = (async () => {
          const temporaryReferences = createTemporaryReferenceSet()
          const decodedArgs = await decodeReply(encodedArguments, {
            temporaryReferences,
          })
          const result = await cacheExecutionEpoch.run(invocationEpoch, () =>
            fn(...decodedArgs),
          )
          const stream = renderToReadableStream(result, {
            environmentName: 'Cache',
          })
          const value = new Uint8Array(await new Response(stream).arrayBuffer())
          if (invocationEpoch === cacheEpoch) {
            await setPersistentCache(cacheKey, value)
          }
          return value
        })()
        pendingEntries.set(pendingKey, pending)
      }
      try {
        bytes = await pending
      } finally {
        if (pendingEntries.get(pendingKey) === pending) {
          pendingEntries.delete(pendingKey)
        }
      }
    }

    const stream = new Blob([Uint8Array.from(bytes)]).stream()
    const result = createFromReadableStream(stream, {
      environmentName: 'Cache',
      replayConsoleLogs: true,
    })
    return result
  }

  return cachedFn
}

export async function resetCache() {
  if (resetPromise) await resetPromise
  cacheEpoch++
  const pending = [...pendingEntries.values()]
  resetPromise = (async () => {
    await Promise.allSettled(pending)
    await resetPersistentCache()
  })()
  try {
    await resetPromise
  } finally {
    resetPromise = undefined
  }
}

async function replyToCacheKey(reply: string | FormData) {
  if (typeof reply === 'string') {
    return reply
  }
  const encoder = new TextEncoder()
  const parts: Uint8Array<ArrayBuffer>[] = []
  for (const [name, value] of reply) {
    if (typeof value === 'string') {
      appendLengthPrefixedPart(
        parts,
        encoder.encode(JSON.stringify([name, 'string', value])),
      )
    } else {
      appendLengthPrefixedPart(
        parts,
        encoder.encode(JSON.stringify([name, 'file', value.type, value.size])),
      )
      appendLengthPrefixedPart(parts, new Uint8Array(await value.arrayBuffer()))
    }
  }
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    await new Blob(parts).arrayBuffer(),
  )
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function appendLengthPrefixedPart(
  parts: Uint8Array<ArrayBuffer>[],
  value: Uint8Array<ArrayBuffer>,
) {
  const length = new Uint8Array(8)
  new DataView(length.buffer).setBigUint64(0, BigInt(value.byteLength))
  parts.push(length, value)
}

// use fixed sentinel value to detect the existence of cache captures via runtime logic
// without transform-informed metadata
const CACHE_CAPTURE_TYPE = 'use-cache-captures'

type CacheCaptureEnvelope = {
  type: typeof CACHE_CAPTURE_TYPE
  encrypted: string | PromiseLike<string>
}

export function encryptCacheCaptures(
  captures: unknown[],
): CacheCaptureEnvelope {
  // Keep the sentinel envelope synchronous so the cache wrapper can identify it
  // without awaiting the argument; only the encrypted payload needs to be async.
  return {
    type: CACHE_CAPTURE_TYPE,
    encrypted: encryptActionBoundArgs(captures),
  }
}

async function decryptCacheCaptures(
  envelope: CacheCaptureEnvelope,
): Promise<unknown[]> {
  const { encrypted } = envelope
  const captures = await decryptActionBoundArgs(Promise.resolve(encrypted))
  if (!Array.isArray(captures)) {
    throw new Error('Invalid cache capture payload')
  }
  return captures
}

function isCacheCaptureEnvelope(value: unknown): value is CacheCaptureEnvelope {
  const encrypted =
    typeof value === 'object' && value !== null && 'encrypted' in value
      ? value.encrypted
      : undefined
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === CACHE_CAPTURE_TYPE &&
    (typeof encrypted === 'string' ||
      (typeof encrypted === 'object' &&
        encrypted !== null &&
        'then' in encrypted &&
        typeof encrypted.then === 'function'))
  )
}
