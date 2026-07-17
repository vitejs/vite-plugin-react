import type React from 'react'

// Pages rendered only in the RSC environment and prerendered during the
// production build. Adding an entry here is the only step: the prerender pass
// renders it into dist/flight/, and its inline actions reach the
// server-references manifest automatically. Imported by the dev and prerender
// entries; the runtime entry locates payloads by pathname alone and never
// imports this module.
export const inlinePages: Record<string, () => Promise<React.ReactNode>> = {
  '/cache-inline': async () => {
    const { CachedInlineContent } = await import('./cached-inline-content')
    return <CachedInlineContent />
  },
  '/cache-inline-second': async () => {
    const { SecondInlineContent } = await import('./second-inline-content')
    return <SecondInlineContent />
  },
}
