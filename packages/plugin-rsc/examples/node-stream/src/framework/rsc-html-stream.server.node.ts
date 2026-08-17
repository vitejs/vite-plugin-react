import { Transform, type Readable, type TransformCallback } from 'node:stream'

// Node stream counterpart of rsc-html-stream/server. Flight chunks are injected
// before the closing document tags while both inputs continue streaming.
const trailer = '</body></html>'

export function injectRSCPayload(
  rscStream: Readable,
  options?: { nonce?: string },
): Transform {
  const decoder = new TextDecoder()
  let htmlTail = ''
  let timer: NodeJS.Timeout | undefined
  let rscPromise: Promise<void> | undefined

  const transform = new Transform({
    transform(chunk: Buffer, _encoding, callback: TransformCallback) {
      htmlTail += decoder.decode(chunk, { stream: true })
      schedule()
      callback()
    },
    flush(callback: TransformCallback) {
      if (timer) clearTimeout(timer)
      flushHtml(false)
      void startRsc().then(() => {
        htmlTail += decoder.decode()
        flushHtml(true)
        transform.push(trailer)
        callback()
      }, callback)
    },
  })

  function schedule() {
    if (timer) return
    timer = setTimeout(() => {
      timer = undefined
      flushHtml(false)
      void startRsc().catch((error) => transform.destroy(error))
    }, 0)
  }

  function flushHtml(final: boolean) {
    const keep = final ? 0 : trailer.length
    const length = Math.max(0, htmlTail.length - keep)
    if (length > 0) {
      transform.push(htmlTail.slice(0, length))
      htmlTail = htmlTail.slice(length)
    }
    if (final) {
      transform.push(
        htmlTail.endsWith(trailer)
          ? htmlTail.slice(0, -trailer.length)
          : htmlTail,
      )
      htmlTail = ''
    }
  }

  function startRsc(): Promise<void> {
    return (rscPromise ??= writeRscStream(rscStream, transform, options?.nonce))
  }

  return transform
}

async function writeRscStream(
  rscStream: Readable,
  transform: Transform,
  nonce: string | undefined,
) {
  const decoder = new TextDecoder('utf-8', { fatal: true })
  for await (const chunk of rscStream) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    try {
      writeChunk(JSON.stringify(decoder.decode(bytes, { stream: true })))
    } catch {
      writeChunk(
        `Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}), m => m.codePointAt(0))`,
      )
    }
  }
  const remaining = decoder.decode()
  if (remaining) writeChunk(JSON.stringify(remaining))

  function writeChunk(chunk: string) {
    const script = `(self.__FLIGHT_DATA||=[]).push(${chunk})`
    transform.push(
      `<script${nonce ? ` nonce="${nonce}"` : ''}>${escapeScript(script)}</script>`,
    )
  }
}

function escapeScript(script: string): string {
  return script.replace(/<!--/g, '<\\!--').replace(/<\/(script)/gi, '</\\$1')
}
