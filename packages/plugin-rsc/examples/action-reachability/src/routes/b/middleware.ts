import { runWithActionContext } from '../../framework/action-context.ts'
import type { RouteMiddleware } from '../../framework/middleware.ts'

export const middleware: RouteMiddleware = (request, next) =>
  runWithActionContext({ request, route: '/b' }, next)
