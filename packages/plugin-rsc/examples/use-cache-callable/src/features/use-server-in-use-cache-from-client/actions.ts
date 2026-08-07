'use cache'

import { state } from './state'

export async function defaultAction() {
  state.defaultExecutions++
}

export async function overrideAction() {
  'use server'
  state.overrideExecutions++
}
