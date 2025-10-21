// Browser polyfill for node:async_hooks
export class AsyncLocalStorage {
  constructor() {
    this.store = undefined
  }

  run(store, callback, ...args) {
    const prev = this.store
    this.store = store
    try {
      return callback(...args)
    } finally {
      this.store = prev
    }
  }

  getStore() {
    return this.store
  }
}
