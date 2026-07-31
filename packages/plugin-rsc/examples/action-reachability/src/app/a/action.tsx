'use server'

import { getRequestContext } from '../request-context.ts'

export async function actionA() {
  return `ACTION_A_OK:${getRequestContext().middlewareTag}`
}

export async function progressiveActionA(_formData: FormData) {
  if (getRequestContext().middlewareTag !== 'MIDDLEWARE_A') {
    throw new Error('Progressive action A ran outside route A middleware')
  }
}

export async function boundProgressiveActionA(
  _bound: string,
  formData: FormData,
) {
  return progressiveActionA(formData)
}
