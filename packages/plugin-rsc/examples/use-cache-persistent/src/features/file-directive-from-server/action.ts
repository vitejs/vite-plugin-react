'use server'

import { resetCache } from '../../framework/use-cache-runtime'
import { state } from './state'

export async function resetAction() {
  await resetCache()
  state.executionCount = 0
}
