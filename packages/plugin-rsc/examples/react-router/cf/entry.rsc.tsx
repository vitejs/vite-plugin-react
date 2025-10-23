import { fetchServer } from '../react-router-vite/entry.rsc'

console.log('[debug:cf-rsc-entry]')

export default {
  fetch(request: Request) {
    return fetchServer(request)
  },
}
