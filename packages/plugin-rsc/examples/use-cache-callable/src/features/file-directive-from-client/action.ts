'use cache'

import { state } from './state'

export async function cachedFromClient(formData: FormData) {
  const argument = String(formData.get('argument'))
  state.executionCount++
  state.result = `client import + ${argument}`
}
