import { AsyncLocalStorage } from 'node:async_hooks'

type ActionContext = {
  request: Request
  route: string
}

const actionContextStorage = new AsyncLocalStorage<ActionContext>()

export function runWithActionContext<T>(
  context: ActionContext,
  callback: () => T,
): T {
  return actionContextStorage.run(context, callback)
}

export function getActionContext(): ActionContext {
  const context = actionContextStorage.getStore()
  if (!context) throw new Error('Action context is not available')
  return context
}
