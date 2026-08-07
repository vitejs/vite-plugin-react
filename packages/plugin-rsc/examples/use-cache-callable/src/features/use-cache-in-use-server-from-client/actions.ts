'use server'

import { state } from './state'

export async function defaultAction() {
  state.defaultExecutions++
}

export async function overrideAction() {
  'use cache'
  state.overrideExecutions++
}
