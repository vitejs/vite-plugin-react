'use server'

import { getRequestContext } from '../request-context.ts'

export async function actionA() {
  return `ACTION_A_OK:${getRequestContext().middlewareTag}`
}
