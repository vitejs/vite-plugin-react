import { handleRequest } from './framework/entry.rsc.tsx'
import './styles.css'

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const { Root } = await import('./routes/root.tsx')
  const root = (
    <>
      {import.meta.viteRsc.loadCss()}
      <Root url={url} />
    </>
  )
  const nonce = !process.env.NO_CSP ? crypto.randomUUID() : undefined
  const response = await handleRequest({ request, getRoot: () => root })
  if (nonce && response.headers.get('content-type')?.includes('text/html')) {
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
