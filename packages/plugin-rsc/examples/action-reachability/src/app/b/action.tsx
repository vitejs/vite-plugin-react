'use server'

import { getRequestContext } from '../request-context.ts'

export async function actionB() {
  return `ACTION_B_OK:${getRequestContext().middlewareTag}`
}
