import handler from '../react-router-vite/entry.ssr'

console.log('[debug:cf-ssr-entry]')

export default {
  async fetch(request: Request, env: any) {
    return handler(request, await env.RSC.fetch(request))
  },
}
