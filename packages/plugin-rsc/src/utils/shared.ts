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

export function memoize<Argument, Result>(
  fn: (argument: Argument) => Result,
): (argument: Argument) => Result {
  const cache = new Map<Argument, Result>()
  return (argument) => {
    const value = cache.get(argument)
    if (typeof value !== 'undefined') {
      return value
    }
    const newValue = fn(argument)
    cache.set(argument, newValue)
    return newValue
  }
}
