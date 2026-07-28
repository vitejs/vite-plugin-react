export type RouteMiddleware = (
  request: Request,
  next: () => Promise<Response>,
) => Promise<Response>
