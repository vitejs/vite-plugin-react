export function tinyassert(
  value: unknown,
  message?: string | Error,
): asserts value {
  if (value) return
  if (message instanceof Error) throw message
  throw new Error(message ?? 'TinyAssertionError')
}

export function memoize<Argument, Result>(
  fn: (argument: Argument) => Result,
): (argument: Argument) => Result {
  const cache = new Map<Argument, Result>()
  return (argument) => {
    const cached = cache.get(argument)
    if (cached !== undefined) return cached
    const result = fn(argument)
    cache.set(argument, result)
    return result
  }
}

export function once<Result>(fn: () => Result): () => Result {
  let called = false
  let result: Result
  return () => {
    if (!called) {
      result = fn()
      called = true
    }
    return result
  }
}
