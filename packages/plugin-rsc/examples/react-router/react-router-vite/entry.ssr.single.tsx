import baseHandler from './entry.ssr'

export default async function handler(request: Request) {
  const rsc = await import.meta.viteRsc.loadModule<
    typeof import('./entry.rsc')
  >('rsc', 'index')
  return baseHandler(request, rsc.fetchServer)
}
