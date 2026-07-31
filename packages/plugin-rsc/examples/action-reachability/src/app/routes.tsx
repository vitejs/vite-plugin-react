import type { RouteMiddleware } from '../framework/middleware.ts'
import { middleware as middlewareA } from './a/middleware.ts'
import { Page as PageA } from './a/page.tsx'
import { middleware as middlewareB } from './b/middleware.ts'
import { Page as PageB } from './b/page.tsx'
import { middleware as middlewareC } from './c/middleware.ts'
import { Page as PageC } from './c/page.tsx'
import { Root } from './root.tsx'

// TODO: A framework would generate this registry from its route convention.
// This example declares it explicitly for simplicity.
export const routes = {
  '/a': { Page: PageA, middleware: middlewareA },
  '/b': { Page: PageB, middleware: middlewareB },
  '/c': { Page: PageC, middleware: middlewareC },
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
