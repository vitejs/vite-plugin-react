import { handleRequest } from './framework/entry.rsc.tsx'
import './styles.css'
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'
import { provideCache } from 'vite-plugin-react-use-cache/runtime'
import { createUnstorageCache } from 'vite-plugin-react-use-cache/unstorage'

const storage = createStorage({
  driver: fsDriver({ base: './node_modules/.use-cache' }),
})

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const { Root } = await import('./routes/root.tsx')
  const nonce = !process.env.NO_CSP ? crypto.randomUUID() : undefined
  // https://vite.dev/guide/features.html#content-security-policy-csp
  // this isn't needed if `style-src: 'unsafe-inline'` (dev) and `script-src: 'self'`
  const nonceMeta = nonce && <meta property="csp-nonce" nonce={nonce} />
  const root = (
    <>
      {/* this `loadCss` only collects `styles.css` but not css inside dynamic import `root.tsx` */}
      {import.meta.viteRsc.loadCss()}
      {nonceMeta}
      <Root url={url} />
    </>
  )
  const response = await provideCache(createUnstorageCache(storage), () => {
    return handleRequest({
      request,
      getRoot: () => root,
      nonce,
    })
  })
  // const response = await handleRequest({
  //   request,
  //   getRoot: () => root,
  //   nonce,
  // })
  if (nonce && response.headers.get('content-type')?.includes('text/html')) {
    const cspValue = [
      `default-src 'self';`,
      // `unsafe-eval` is required during dev since React uses eval for findSourceMapURL feature
      `script-src 'self' 'nonce-${nonce}' ${import.meta.env.DEV ? `'unsafe-eval'` : ``};`,
      `style-src 'self' 'unsafe-inline';`,
      `img-src 'self' data:;`,
      // allow blob: worker for Vite server ping shared worker
      import.meta.hot && `worker-src 'self' blob:;`,
    ]
      .filter(Boolean)
      .join('')
    response.headers.set('content-security-policy', cspValue)
  }
  return response
}

export default {
  fetch: handler,
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
