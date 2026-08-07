'use server'

import { state } from './state'

export async function defaultAction(_key: string) {
  state.defaultExecutions++
}

export async function overrideAction(_key: string) {
  'use cache'
  state.overrideExecutions++
}
