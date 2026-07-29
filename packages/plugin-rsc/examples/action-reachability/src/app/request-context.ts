import { AsyncLocalStorage } from 'node:async_hooks'

type RequestContext = {
  middlewareTag: string
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>()

export function runWithRequestContext<T>(
  context: RequestContext,
  callback: () => T,
): T {
  return requestContextStorage.run(context, callback)
}

export function getRequestContext(): RequestContext {
  const context = requestContextStorage.getStore()
  if (!context) throw new Error('Request context is not available')
  return context
}
