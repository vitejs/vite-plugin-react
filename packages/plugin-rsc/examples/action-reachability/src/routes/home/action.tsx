'use server'

import { getActionContext } from '../../framework/action-context.ts'

export async function objectWrappedAction() {
  return `HOME_ACTION_OK:${getActionContext().route}`
}
