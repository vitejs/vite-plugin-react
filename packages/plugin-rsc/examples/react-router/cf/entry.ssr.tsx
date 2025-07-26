import * as entrySSR from '../src/entry.ssr'

console.log('[debug:cf-ssr-entry]')

// TODO:
// shouldn't "entry.rsc.tsx" be the main server entry
// and optionally call "entry.ssr.tsx" only for rendering html?

export default {
  fetch(request: Request, env: any) {
    return entrySSR.generateHTML(request, (request: Request) =>
      env.RSC.fetch(request),
    )
  },
}
