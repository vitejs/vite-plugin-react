import * as React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import * as ReactClient from '@vitejs/plugin-rsc/react/browser'
import type { RscPayload } from './server'

export function initialize() {
  ReactClient.setRequireModule({
    load: (id) => import(/* @vite-ignore */ id),
  })
}

export function render(rscStream: ReadableStream<Uint8Array>) {
  let rscPaylod: Promise<RscPayload>

  function ClientRoot() {
    rscPaylod ??= ReactClient.createFromReadableStream<RscPayload>(rscStream)
    return React.use(rscPaylod).root
  }

  const domRoot = document.getElementById('root')!
  const reactRoot = ReactDOMClient.createRoot(domRoot)
  reactRoot.render(
    <React.StrictMode>
      <ClientRoot />
    </React.StrictMode>,
  )
}
