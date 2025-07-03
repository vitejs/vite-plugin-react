import * as ReactRsc from '@hiogawa/vite-rsc/rsc'

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
    // NOTE: using `renderToReadableStream` here for arguments serialization would end up
    // serializing react elements (e.g. children props), which causes
    // those arguments to be included as a cache key and it doesn't achieve
    // "use cache static shell + dynamic children props" pattern.
    // cf. https://nextjs.org/docs/app/api-reference/directives/use-cache#non-serializable-arguments
    const clientTemporaryReferences =
      ReactRsc.createClientTemporaryReferenceSet()
    const encodedArguments = await ReactRsc.encodeReply(args, {
      temporaryReferences: clientTemporaryReferences,
    })
    const serializedCacheKey = await replyToCacheKey(encodedArguments)

    // cache `fn` result as stream
    // (cache value is promise so that it dedupes concurrent async calls)
    const entryPromise = (cacheEntries[serializedCacheKey] ??= (async () => {
      const temporaryReferences = ReactRsc.createTemporaryReferenceSet()
      const decodedArgs = await ReactRsc.decodeReply(encodedArguments, {
        temporaryReferences,
      })

      // run the original function
      const result = await fn(...decodedArgs)

      // serialize result to a ReadableStream
      const stream = ReactRsc.renderToReadableStream(result, {
        environmentName: 'Cache',
        temporaryReferences,
      })
      return new StreamCacher(stream)
    })())

    // deserialized cached stream
    const stream = (await entryPromise).get()
    const result = ReactRsc.createFromReadableStream(stream, {
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
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    await new Response(reply).arrayBuffer(),
  )
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}
