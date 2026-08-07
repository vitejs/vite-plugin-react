'use cache'

import { getDirectLabel } from './dep-direct'
import { state } from './state'

export async function cachedFromServer(argument: string) {
  state.executionCount++
  return `server import + body-v1 + ${getDirectLabel()} + ${argument}`
}
