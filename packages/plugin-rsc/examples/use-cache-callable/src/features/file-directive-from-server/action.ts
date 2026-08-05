'use cache'

import { state } from './state'

// Next.js excludes statically known object and array exports from "use cache"
// server-reference handling. The transform filter mirrors that narrow case.
export const objectValue = { text: 'object' }
export const arrayValue = ['array']

export async function cachedFromServer(formData: FormData) {
  const argument = String(formData.get('argument'))
  state.executionCount++
  state.result = `server import + ${argument}`
}
