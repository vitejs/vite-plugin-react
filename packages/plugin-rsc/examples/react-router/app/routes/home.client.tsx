'use client'

import { useFormStatus } from 'react-dom'

export function PendingButton() {
  const status = useFormStatus()
  return (
    <button className="btn" type="submit" disabled={status.pending}>
      {status.pending ? 'Pending...' : 'Log on server'}
    </button>
  )
}
