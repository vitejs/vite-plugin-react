'use cache'

import { getDirectLabel } from './direct'
import { state } from './state'

export async function cachedFromServer(formData: FormData) {
  const argument = String(formData.get('argument'))
  state.executionCount++
  state.result = `server import + body-v1 + ${getDirectLabel()} + ${argument}`
  return state.result
}
