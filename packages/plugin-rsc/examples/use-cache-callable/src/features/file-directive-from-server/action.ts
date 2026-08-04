'use cache'

import { state } from './state'

// Next.js permits object and array values as ordinary exports from "use cache"
// modules, primarily for metadata and viewport objects.
export const metadata = {}
export const tags: string[] = []

export async function cachedFromServer(formData: FormData) {
  const argument = String(formData.get('argument'))
  state.executionCount++
  state.result = `server import + ${argument}`
}
