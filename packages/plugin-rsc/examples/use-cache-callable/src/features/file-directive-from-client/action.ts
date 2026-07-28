'use cache'

import { state } from './state'

export async function cachedFromClient(formData: FormData) {
  const argument = String(formData.get('argument'))
  state.implementationCalls++
  state.result = `client:${argument}:${state.implementationCalls}`
}
