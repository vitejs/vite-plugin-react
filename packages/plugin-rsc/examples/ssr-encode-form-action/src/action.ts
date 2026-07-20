'use server'

import { setServerState } from './state'

export async function testAction(boundValue: string, formData: FormData) {
  setServerState(`${boundValue}:${formData.get('value')}`)
}
