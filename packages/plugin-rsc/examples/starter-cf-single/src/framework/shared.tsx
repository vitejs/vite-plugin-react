import type React from 'react'
import type { ReactFormState } from 'react-dom/client'

export const RSC_POSTFIX = '_.rsc'

export type RscPayload = {
  root: React.ReactNode
  returnValue?: { ok: boolean; data: unknown }
  formState?: ReactFormState
}
