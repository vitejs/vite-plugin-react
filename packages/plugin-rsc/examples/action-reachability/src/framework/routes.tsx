import { middleware as homeMiddleware } from '../routes/home/middleware.ts'
import { Page as HomePage } from '../routes/home/page.tsx'
import { middleware as otherMiddleware } from '../routes/other/middleware.ts'
import { Page as OtherPage } from '../routes/other/page.tsx'

export const routes = {
  '/': { Page: HomePage, middleware: homeMiddleware },
  '/other': { Page: OtherPage, middleware: otherMiddleware },
}

export function getRoute(pathname: string) {
  return routes[pathname as keyof typeof routes] ?? routes['/']
}
