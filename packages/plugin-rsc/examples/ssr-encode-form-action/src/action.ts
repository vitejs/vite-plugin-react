'use server'

import { setResult } from './state'

export async function submit(boundValue: string, formData: FormData) {
  setResult(`${boundValue}:${formData.get('value')}`)
}
