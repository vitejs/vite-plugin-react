'use server'

import { getActionContext } from '../action-context.ts'

export async function actionB() {
  return `ACTION_B_OK:${getActionContext().route}`
}
