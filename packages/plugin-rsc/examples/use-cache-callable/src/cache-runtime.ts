type CacheFunction = (...args: string[]) => Promise<string>

export default function cacheWrapper(
  implementation: CacheFunction,
): CacheFunction {
  const entries = new Map<string, Promise<string>>()

  return (...args) => {
    const key = JSON.stringify(args)
    let result = entries.get(key)
    if (!result) {
      result = implementation(...args)
      entries.set(key, result)
    }
    return result
  }
}
