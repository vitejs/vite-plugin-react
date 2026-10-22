'use client'

import type { ReactNode } from 'react'

export function ClientPage({ children }: { children: ReactNode }) {
  return <main>{children}</main>
}
