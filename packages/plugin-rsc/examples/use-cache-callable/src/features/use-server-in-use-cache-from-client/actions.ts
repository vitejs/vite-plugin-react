'use cache'

import { state } from './state'

// Variable exports stay assignable when the file-level cache wrapper runs
// before the inline server transform.
export const defaultAction = async () => {
  state.defaultExecutions++
}

export const overrideAction = async () => {
  'use server'
  state.overrideExecutions++
}
