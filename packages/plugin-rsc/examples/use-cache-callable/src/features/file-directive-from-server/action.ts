'use cache'

import { state } from './state'

export const metadata = {}
export const tags: string[] = []

export async function cachedFromServer(formData: FormData) {
  const argument = String(formData.get('argument'))
  state.executionCount++
  state.result = `server import + ${argument}`
}
