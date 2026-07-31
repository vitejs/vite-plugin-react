'use server'

import { getRequestContext } from '../request-context.ts'

export async function progressiveActionC(_formData: FormData) {
  if (getRequestContext().middlewareTag !== 'MIDDLEWARE_C') {
    throw new Error('Progressive action C ran outside route C middleware')
  }
}

export async function boundProgressiveActionC(
  _bound: string,
  formData: FormData,
) {
  return progressiveActionC(formData)
}
