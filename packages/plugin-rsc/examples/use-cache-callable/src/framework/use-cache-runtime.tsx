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

// based on
// https://github.com/vercel/next.js/pull/70435
// https://github.com/vercel/next.js/blob/09a2167b0a970757606b7f91ff2d470f77f13f8c/packages/next/src/server/use-cache/use-cache-wrapper.ts

export type CacheWrapperOptions = {
  argumentCount?: number
  /**
   * Number of closure captures, known from the transform. A function with
   * captures always receives them encrypted as its first argument.
   */
  captureCount?: number
}

const cachedFnMap = new WeakMap<Function, unknown>()
let cachedFnCacheEntries = new WeakMap<
  Function,
  Record<string, Promise<StreamCacher>>
>()

export default function cacheWrapper(
  fn: (...args: any[]) => Promise<unknown>,
  options: CacheWrapperOptions,
) {
  if (cachedFnMap.has(fn)) {
    return cachedFnMap.get(fn)!
  }

  async function cachedFn(...args: any[]): Promise<unknown> {
    // A function with captures receives them encrypted as its first argument,
    // bound at the call site. `captureCount` comes from the transform, so the
    // runtime decrypts that argument whatever a client sends in its place.
    const captureCount = options.captureCount ?? 0
    const encryptedCaptures = captureCount > 0 ? args[0] : undefined
    const callerArgs = captureCount > 0 ? args.slice(1) : args
    // Callers can supply more arguments than a cached function declares. For example,
    // `useActionState(fn)` passes state and form data even to `function fn() {}`.
    // Strip extras from caller arguments so they affect neither the cache key nor execution.
    // https://github.com/vercel/next.js/pull/72506
    const admittedArgs =
      options.argumentCount === undefined
        ? callerArgs
        : callerArgs.slice(0, options.argumentCount)
    let cacheEntries = cachedFnCacheEntries.get(cachedFn)
    if (!cacheEntries) {
      cacheEntries = {}
      cachedFnCacheEntries.set(cachedFn, cacheEntries)
    }

    // Serialize arguments to a cache key via `encodeReply` from `react-server-dom/client`.
    // NOTE: using `renderToReadableStream` here for arguments serialization would end up
    // serializing react elements (e.g. children props), which causes
    // those arguments to be included as a cache key and it doesn't achieve
    // "use cache static shell + dynamic children props" pattern.
    // cf. https://nextjs.org/docs/app/api-reference/directives/use-cache#non-serializable-arguments
    const clientTemporaryReferences = createClientTemporaryReferenceSet()
    let executionArguments = admittedArgs
    if (captureCount > 0) {
      // Decrypt in the framework runtime so cache identity and execution share
      // these values; the transformed implementation only destructures the array.
      const captures = await decryptCacheCaptures(
        encryptedCaptures,
        captureCount,
      )
      executionArguments = [captures, ...admittedArgs]
    }
    const encodedArguments = await encodeReply(executionArguments, {
      temporaryReferences: clientTemporaryReferences,
    })
    const serializedCacheKey = await replyToCacheKey(encodedArguments)

    // cache `fn` result as stream
    // (cache value is promise so that it dedupes concurrent async calls)
    const entryPromise = (cacheEntries[serializedCacheKey] ??= (async () => {
      const temporaryReferences = createTemporaryReferenceSet()
      const decodedArgs = await decodeReply(encodedArguments, {
        temporaryReferences,
      })

      // run the original function
      const result = await fn(...decodedArgs)

      // serialize result to a ReadableStream
      const stream = renderToReadableStream(result, {
        environmentName: 'Cache',
        temporaryReferences,
      })
      return new StreamCacher(stream)
    })())

    // deserialized cached stream
    const stream = (await entryPromise).get()
    const result = createFromReadableStream(stream, {
      environmentName: 'Cache',
      replayConsoleLogs: true,
      temporaryReferences: clientTemporaryReferences,
    })
    return result
  }

  cachedFnMap.set(fn, cachedFn)

  return cachedFn
}

export function revalidateCache(cachedFn: Function) {
  cachedFnCacheEntries.delete(cachedFn)
}

export function resetCache() {
  cachedFnCacheEntries = new WeakMap()
}

class StreamCacher {
  constructor(private stream: ReadableStream<Uint8Array>) {}
  get(): ReadableStream<Uint8Array> {
    const [returnStream, savedStream] = this.stream.tee()
    this.stream = savedStream
    return returnStream
  }
}

async function replyToCacheKey(reply: string | FormData) {
  if (typeof reply === 'string') {
    return reply
  }
  // `new Response(reply).arrayBuffer()` would serialize FormData with a random
  // multipart boundary, so encode entries directly to keep cache keys stable.
  const parts: BlobPart[] = []
  for (const [name, value] of reply) {
    if (typeof value === 'string') {
      parts.push(JSON.stringify([name, 'string', value]), '\0')
    } else {
      parts.push(
        JSON.stringify([name, 'file']),
        '\0',
        await value.arrayBuffer(),
        '\0',
      )
    }
  }
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    await new Blob(parts).arrayBuffer(),
  )
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

export function encryptCacheCaptures(captures: unknown[]): Promise<string> {
  return encryptActionBoundArgs(captures)
}

async function decryptCacheCaptures(
  encrypted: unknown,
  captureCount: number,
): Promise<unknown[]> {
  // `encryptActionBoundArgs` returns a promise, and a client call sends it back
  // as a promise reference, which `decodeReply` restores as a promise.
  if (!(encrypted instanceof Promise)) {
    throw new Error('Invalid cache captures')
  }
  const captures = await decryptActionBoundArgs(encrypted)
  if (!Array.isArray(captures) || captures.length !== captureCount) {
    throw new Error('Invalid cache captures')
  }
  return captures
}
