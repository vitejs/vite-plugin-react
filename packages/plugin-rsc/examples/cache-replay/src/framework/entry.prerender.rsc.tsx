import { mkdir, writeFile } from 'node:fs/promises'
// The public '@vitejs/plugin-rsc/rsc' entry imports the build's assets
// manifest, which buildApp writes only after this bundle has already executed.
import { renderToReadableStream } from '@vitejs/plugin-rsc/react/rsc/server'
import { inlinePages } from '../inline-pages'

// Lands in dist/flight/; entry.runtime.rsc.tsx reads payloads relative to its
// own bundle.
const outDir = new URL('../flight/', import.meta.url)
await mkdir(outDir, { recursive: true })
for (const [pathname, load] of Object.entries(inlinePages)) {
  const stream = renderToReadableStream(await load())
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  await writeFile(new URL(`.${pathname}.flight`, outDir), bytes)
}
