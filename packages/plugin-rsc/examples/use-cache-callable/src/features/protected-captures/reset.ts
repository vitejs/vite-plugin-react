'use server'

import { resetCache } from '../../framework/use-cache-runtime'
import { state } from './state'

export async function resetAction() {
  resetCache()
  state.capture = 'first'
  state.executionCount = 0
  state.result = 'not called'
}

export async function selectCaptureAction(formData: FormData) {
  state.capture = String(formData.get('capture'))
}
