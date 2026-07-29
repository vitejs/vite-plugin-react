'use server'

import { getActionContext } from '../action-context.ts'

export async function actionA() {
  return `ACTION_A_OK:${getActionContext().route}`
}
