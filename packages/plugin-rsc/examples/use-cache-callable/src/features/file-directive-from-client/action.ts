'use cache'

import { state } from './state'

export const metadata = { title: 'cached metadata' }
export const tags = ['cache']

export async function cachedFromClient(formData: FormData) {
  const argument = String(formData.get('argument'))
  state.executionCount++
  state.result = `client import + ${argument}`
}
