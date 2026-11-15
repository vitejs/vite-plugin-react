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

export function once<Fn extends (...args: any[]) => any>(fn: Fn): Fn {
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
