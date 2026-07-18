import { mkdir, writeFile } from 'node:fs/promises'
import { renderToReadableStream } from '@vitejs/plugin-rsc/react/rsc/server'
import { InlinePage } from '../inline-page'

const outDir = new URL('../flight/', import.meta.url)
await mkdir(outDir, { recursive: true })
const stream = renderToReadableStream(<InlinePage />)
const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
await writeFile(new URL('page.flight', outDir), bytes)
