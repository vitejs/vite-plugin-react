'use cache'

import { state } from './state'

// Variable exports stay assignable when the file-level cache wrapper runs
// before the inline server transform.
export const defaultAction = async (_key: string) => {
  state.defaultExecutions++
}

export const overrideAction = async (_key: string) => {
  'use server'
  state.overrideExecutions++
}
