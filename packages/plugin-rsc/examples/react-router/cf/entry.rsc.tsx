import handler from '../react-router-vite/entry.rsc'

console.log('[debug:cf-rsc-entry]')

export default {
  fetch(request: Request) {
    return handler(request)
  },
}
