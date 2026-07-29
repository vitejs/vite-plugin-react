import type { RouteMiddleware } from '../../framework/middleware.ts'
import { runWithActionContext } from '../action-context.ts'

export const middleware: RouteMiddleware = (request, next) =>
  runWithActionContext({ request, route: '/a' }, next)
