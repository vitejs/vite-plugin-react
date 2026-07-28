'use cache'

import { state } from './state'

export async function cachedFromServer(formData: FormData) {
  const argument = String(formData.get('argument'))
  state.implementationCalls++
  state.result = `server:${argument}:${state.implementationCalls}`
}
