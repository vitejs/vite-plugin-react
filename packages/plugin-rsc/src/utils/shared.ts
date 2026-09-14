export function tinyassert(
  value: unknown,
  message?: string | Error,
): asserts value {
  if (value) {
    return
  }
  if (message instanceof Error) {
    throw message
  }
  throw new TinyAssertionError(message, tinyassert)
}

export class TinyAssertionError extends Error {
  constructor(message?: string, stackStartFunction?: Function) {
    super(message ?? 'TinyAssertionError')
    if (stackStartFunction && 'captureStackTrace' in Error) {
      Error.captureStackTrace(this, stackStartFunction)
    }
  }
}

type AnyFunction = (...args: any[]) => any

export function once<Fn extends AnyFunction>(fn: Fn): Fn {
  let result: ReturnType<Fn>
  let called = false
  return function (this: unknown, ...args: Parameters<Fn>) {
    if (!called) {
      result = fn.apply(this, args)
      called = true
    }
    return result
  } as Fn
}

export function memoize<Fn extends AnyFunction>(
  fn: Fn,
  options?: {
    keyFn?: (...args: Parameters<Fn>) => unknown
    cache?: {
      get(key: unknown): ReturnType<Fn> | undefined
      set(key: unknown, value: ReturnType<Fn>): void
    }
  },
): Fn {
  const keyFn = options?.keyFn ?? ((...args) => args[0])
  const cache = options?.cache ?? new Map<unknown, ReturnType<Fn>>()
  return function (this: unknown, ...args: Parameters<Fn>) {
    const key = keyFn(...args)
    const value = cache.get(key)
    if (typeof value !== 'undefined') {
      return value
    }
    const newValue = fn.apply(this, args)
    cache.set(key, newValue)
    return newValue
  } as Fn
}
