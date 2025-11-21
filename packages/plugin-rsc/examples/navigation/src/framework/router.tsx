import { createContext, use } from 'react'

export type RouterContextType = {
  url: string
  navigate: (to: string, options?: { replace?: boolean }) => void
}

export const RouterContext = createContext<RouterContextType>(undefined!)

export function useRouter() {
  return use(RouterContext)
}

function createRouter() {}
