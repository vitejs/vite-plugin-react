'use server'

import { getActionContext } from '../../framework/action-context.ts'

export async function otherAction() {
  return `OTHER_ACTION_OK:${getActionContext().route}`
}
