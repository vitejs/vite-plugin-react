'use server'

import { getActionContext } from '../../framework/action-context.ts'

export async function actionB() {
  return `ACTION_B_OK:${getActionContext().route}`
}
