import { writeFile } from 'node:fs/promises'
// The public '@vitejs/plugin-rsc/rsc' entry imports the build's assets
// manifest, which buildApp writes only after this bundle has already executed.
import { renderToReadableStream } from '@vitejs/plugin-rsc/react/rsc/server'
import { CachedInlineContent } from '../cached-inline-content'

const stream = renderToReadableStream(<CachedInlineContent />)
const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
// Lands in dist/; entry.runtime.rsc.tsx reads it relative to its own bundle.
await writeFile(new URL('../.flight-inline-prerender', import.meta.url), bytes)
