'use server'

import { actionState } from './action-state'

actionState.imported = true

export async function testAction() {
  actionState.invoked = true
}
