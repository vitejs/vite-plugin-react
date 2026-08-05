'use cache'

import { state } from './state'

export async function cachedWithoutArguments() {
  state.executionCount++
  state.result = `arguments: ${arguments.length}`
}
