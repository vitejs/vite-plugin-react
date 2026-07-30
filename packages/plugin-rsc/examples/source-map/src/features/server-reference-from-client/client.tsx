'use client'

import { SourceLocationCase } from '../../client'
import { clientImportedAction } from './action'

export function ServerReferenceFromClientClient() {
  return (
    <SourceLocationCase
      name="server-reference-from-client"
      action={clientImportedAction}
    />
  )
}
