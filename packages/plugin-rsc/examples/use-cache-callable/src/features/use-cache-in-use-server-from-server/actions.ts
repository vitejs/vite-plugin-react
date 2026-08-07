'use server'

import { resetCache } from '../../framework/use-cache-runtime'
import { state } from './state'

export async function defaultAction(_key: string) {
  state.defaultExecutions++
}

export async function overrideAction(_key: string) {
  'use cache'
  state.overrideExecutions++
}

export async function resetAction() {
  resetCache()
  state.defaultExecutions = 0
  state.overrideExecutions = 0
}
