'use cache'

import { state } from './state'

export async function cachedFromServer(formData: FormData) {
  const argument = String(formData.get('argument'))
  state.executionCount++
  state.result = `server import + ${argument}`
}
