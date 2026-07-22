import { createFromFetch } from '@vitejs/plugin-rsc/browser'
import { startTransition, Suspense, use, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

const initialContent = createFromFetch<ReactNode>(fetch('/rsc?delay=1000'))

function InitialProbe() {
  return use(initialContent)
}

function BrowserApp() {
  const [content, setContent] = useState<ReactNode>()
  const [loading, setLoading] = useState(false)

  function loadProbe() {
    setLoading(true)
    startTransition(async () => {
      const response = fetch('/rsc?delay=1000')
      const nextContent = await createFromFetch<ReactNode>(response)
      setContent(nextContent)
      setLoading(false)
    })
  }

  return (
    <main>
      <h1>RSC performance track probe</h1>
      <h2>Initial probe</h2>
      <Suspense fallback={<p>Loading initial RSC probe...</p>}>
        <InitialProbe />
      </Suspense>
      <h2>On-demand probe</h2>
      <button type="button" onClick={loadProbe} disabled={loading}>
        {loading ? 'Loading RSC probe...' : 'Load RSC probe'}
      </button>
      <section aria-live="polite">{content}</section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<BrowserApp />)
