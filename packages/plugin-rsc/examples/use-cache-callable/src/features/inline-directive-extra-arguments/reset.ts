'use server'

import { resetCache } from '../../framework/use-cache-runtime'
import { state } from './state'

export async function resetAction() {
  resetCache()
  state.executionCount = 0
  state.result = 'not called'
}
