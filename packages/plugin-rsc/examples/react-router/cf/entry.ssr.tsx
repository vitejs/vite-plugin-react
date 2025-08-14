import { generateHTML } from '../react-router-vite/entry.ssr'

console.log('[debug:cf-ssr-entry]')

export default {
  fetch(request: Request, env: any) {
    return generateHTML(request, (request) => env.RSC.fetch(request))
  },
}
