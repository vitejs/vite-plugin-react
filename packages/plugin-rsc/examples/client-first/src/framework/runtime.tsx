export type RscFnCaller = (id: string, args: unknown[]) => Promise<unknown>
let rscFnCaller: RscFnCaller

export function setRscFnCaller(callerImpl: RscFnCaller) {
  rscFnCaller = callerImpl
}

// React use() requires the same promise when a suspended render restarts. This
// minimal argument-keyed cache is module-scoped, including during SSR.
export function createRscFn<TArgs extends unknown[], TResult>(
  id: string,
  handler: (...args: TArgs) => Promise<TResult>,
) {
  const promises = new Map<string, Promise<TResult>>()
  const rscFn = (...args: TArgs) => {
    const key = JSON.stringify(args)
    let promise = promises.get(key)
    if (!promise) {
      promise = rscFnCaller(id, args) as Promise<TResult>
      promises.set(key, promise)
    }
    return promise
  }
  rscFn.handler = handler
  return rscFn
}
