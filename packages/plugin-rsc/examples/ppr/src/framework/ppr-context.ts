import { AsyncLocalStorage } from 'node:async_hooks'

const prerenderStorage = new AsyncLocalStorage<boolean>()
const pending = new Promise<never>(() => {})

export function runPrerender<T>(callback: () => T): T {
  return prerenderStorage.run(true, callback)
}

export function suspendDuringPrerender(): void {
  if (prerenderStorage.getStore()) {
    throw pending
  }
}
