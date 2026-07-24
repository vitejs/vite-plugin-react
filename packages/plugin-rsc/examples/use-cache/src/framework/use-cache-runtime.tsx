import {
  createClientTemporaryReferenceSet,
  createFromReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  encodeReply,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'

// based on
// https://github.com/vercel/next.js/pull/70435
// https://github.com/vercel/next.js/blob/09a2167b0a970757606b7f91ff2d470f77f13f8c/packages/next/src/server/use-cache/use-cache-wrapper.ts
const cachedFnMap = new WeakMap<Function, unknown>()
const cachedFnCacheEntries = new WeakMap<
  Function,
  Record<string, Promise<StreamCacher>>
>()

export default function cacheWrapper(fn: (...args: any[]) => Promise<unknown>) {
  if (cachedFnMap.has(fn)) {
    return cachedFnMap.get(fn)!
  }

  async function cachedFn(...args: any[]): Promise<unknown> {
    let cacheEntries = cachedFnCacheEntries.get(cachedFn)
    if (!cacheEntries) {
      cacheEntries = {}
      cachedFnCacheEntries.set(cachedFn, cacheEntries)
    }

    // Serialize arguments to a cache key via `encodeReply` from `react-server-dom/client`.
    // Using `renderToReadableStream` here would serialize React elements such as
    // children props, preventing the static shell + dynamic children pattern.
    // https://nextjs.org/docs/app/api-reference/directives/use-cache#non-serializable-arguments
    const clientTemporaryReferences = createClientTemporaryReferenceSet()
    const encodedArguments = await encodeReply(args, {
      temporaryReferences: clientTemporaryReferences,
    })
    const serializedCacheKey = await replyToCacheKey(encodedArguments)
    // Cache the stream promise to deduplicate concurrent async calls.
    const entryPromise = (cacheEntries[serializedCacheKey] ??= (async () => {
      const temporaryReferences = createTemporaryReferenceSet()
      const decodedArgs = await decodeReply(encodedArguments, {
        temporaryReferences,
      })
      const result = await fn(...decodedArgs)
      const stream = renderToReadableStream(result, {
        environmentName: 'Cache',
        temporaryReferences,
      })
      return new StreamCacher(stream)
    })())

    // Deserialize a fresh branch of the cached stream for each invocation.
    return createFromReadableStream((await entryPromise).get(), {
      environmentName: 'Cache',
      replayConsoleLogs: true,
      temporaryReferences: clientTemporaryReferences,
    })
  }

  cachedFnMap.set(fn, cachedFn)
  return cachedFn
}

export function revalidateCache(cachedFn: Function) {
  cachedFnCacheEntries.delete(cachedFn)
}

class StreamCacher {
  private stream: ReadableStream<Uint8Array>

  constructor(stream: ReadableStream<Uint8Array>) {
    this.stream = stream
  }
  get(): ReadableStream<Uint8Array> {
    const [returnStream, savedStream] = this.stream.tee()
    this.stream = savedStream
    return returnStream
  }
}

async function replyToCacheKey(reply: string | FormData) {
  if (typeof reply === 'string') return reply
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    await new Response(reply).arrayBuffer(),
  )
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}
