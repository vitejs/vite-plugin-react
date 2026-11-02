'use server'

import { getRequestContext } from '../request-context.ts'

export async function actionB() {
  return `ACTION_B_OK:${getRequestContext().middlewareTag}`
}

export async function actionBWithCallback(callback: () => Promise<string>) {
  return `ACTION_B_WITH:${await callback()}`
}
