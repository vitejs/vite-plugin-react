import { renderRequest } from '@vitejs/plugin-rsc/extra/rsc'
import { StateNavigator } from 'navigation'
import stateNavigator from './stateNavigator.ts'

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const { NavigationHandler } = await import('navigation-react')
  const serverNavigator = new StateNavigator(stateNavigator)
  serverNavigator.navigateLink(`${url.pathname}${url.search}`)
  const { App } = await import('./App.tsx')
  const root = (
    <>
      <NavigationHandler stateNavigator={serverNavigator}>
        <App url={`${url.pathname}${url.search}`} />
      </NavigationHandler>
    </>
  )
  // @ts-ignore
  const nonce = !process.env.NO_CSP ? crypto.randomUUID() : undefined
  const response = await renderRequest(request, root, { nonce })
  if (nonce) {
    response.headers.set(
      'content-security-policy',
      `default-src 'self'; ` +
        // `unsafe-eval` is required during dev since React uses eval for findSourceMapURL feature
        `script-src 'self' 'nonce-${nonce}' ${
          import.meta.env.DEV ? `'unsafe-eval'` : ``
        } ; ` +
        `style-src 'self' 'nonce-${nonce}'; `,
    )
  }
  return response
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
