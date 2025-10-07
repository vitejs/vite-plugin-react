'use client'

import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import type { ReactNode } from 'react'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { publicAppRouterInstance } from 'next/dist/client/components/app-router-instance'

export function ContextProvider({ children }: { children: ReactNode }) {
  return (
    <AppRouterContext.Provider value={publicAppRouterInstance}>
      <PathnameContext.Provider value="/bla">
        {children}
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  )
}
