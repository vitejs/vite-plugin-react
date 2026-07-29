import type { RouteMiddleware } from '../../framework/middleware.ts'
import { runWithRequestContext } from '../request-context.ts'

export const middleware: RouteMiddleware = (_request, next) =>
  runWithRequestContext({ middlewareTag: 'MIDDLEWARE_B' }, next)
