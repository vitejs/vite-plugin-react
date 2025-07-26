import { fetchServer } from '../src/entry.rsc'

console.log('[debug:cf-rsc-entry]')

export default {
  fetch(request: Request) {
    return fetchServer(request)
  },
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
