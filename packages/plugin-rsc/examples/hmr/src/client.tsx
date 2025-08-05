import * as ReactClient from '@vitejs/plugin-rsc/browser'
import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { rscStream } from 'rsc-html-stream/client'
import { createFromFetch } from '@vitejs/plugin-rsc/browser'

async function fetchRSC(url: string, options: any) {
  const payload = (await createFromFetch(fetch(url, options))) as any
  return payload.root
}

const initialPayload = await ReactClient.createFromReadableStream<{
  root: React.ReactNode
}>(rscStream)
function Shell() {
  const [root, setRoot] = useState(initialPayload.root)
  useEffect(() => {
    const onHmrReload = () => {
      const root = fetchRSC('/', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
      })
      setRoot(root)
    }
    import.meta.hot?.on('rsc:update', onHmrReload)
    return () => import.meta.hot?.off('rsc:update', onHmrReload)
  })
  return root
}
ReactDOM.hydrateRoot(document, <Shell />)
