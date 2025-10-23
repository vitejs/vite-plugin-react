import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import React from 'react'
import { prerender } from 'react-dom/static.edge'
import { injectRSCPayload } from 'rsc-html-stream/server'
import type { RscPayload } from './entry.rsc'

export async function renderHTML(rscStream: ReadableStream<Uint8Array>) {
  // Duplicate RSC stream:
  // - one for SSR (prerender)
  // - another for browser hydration payload
  const [rscStream1, rscStream2] = rscStream.tee()

  // Deserialize RSC stream back to React VDOM
  let payload: Promise<RscPayload> | undefined
  function SsrRoot() {
    payload ??= createFromReadableStream<RscPayload>(rscStream1)
    return <FixSsrThenable>{React.use(payload).root}</FixSsrThenable>
  }

  // Wrapper component to avoid React SSR bugs with lazy + use
  function FixSsrThenable(props: React.PropsWithChildren) {
    return props.children
  }

  // Use prerender for Partial Prerendering (PPR)
  // This will prerender the static shell and stream dynamic parts
  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')

  const prerenderResult = await prerender(<SsrRoot />, {
    bootstrapScriptContent,
  })

  // Use the prelude which contains the static shell
  let htmlStream: ReadableStream<Uint8Array> = prerenderResult.prelude

  // Inject RSC payload for hydration
  htmlStream = htmlStream.pipeThrough(injectRSCPayload(rscStream2))

  return htmlStream
}
