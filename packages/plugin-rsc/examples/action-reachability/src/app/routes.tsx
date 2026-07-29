import type { RouteMiddleware } from '../framework/middleware.ts'
import { middleware as middlewareA } from './a/middleware.ts'
import { Page as PageA } from './a/page.tsx'
import { middleware as middlewareB } from './b/middleware.ts'
import { Page as PageB } from './b/page.tsx'
import { Root } from './root.tsx'

export const routes = {
  '/a': { Page: PageA, middleware: middlewareA },
  '/b': { Page: PageB, middleware: middlewareB },
}

const rootRoute: {
  Page?: React.ComponentType
  middleware: RouteMiddleware
} = {
  middleware: (_request, next) => next(),
}

export function getRoute(pathname: string) {
  return routes[pathname as keyof typeof routes] ?? rootRoute
}

export function RouteRoot(props: { pathname: string }) {
  const { Page } = getRoute(props.pathname)
  return <Root>{Page && <Page />}</Root>
}
