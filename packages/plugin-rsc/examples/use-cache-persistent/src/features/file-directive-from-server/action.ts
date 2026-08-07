'use cache'

import { getDirectLabel } from './direct'
import { state } from './state'

export async function cachedFromServer(argument: string) {
  state.executionCount++
  state.result = `server import + body-v1 + ${getDirectLabel()} + ${argument}`
  return state.result
}
