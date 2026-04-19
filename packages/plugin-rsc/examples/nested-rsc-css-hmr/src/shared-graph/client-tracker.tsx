'use client'

// Side-effect import of a CSS module that's also consumed by an RSC
// component (`./card.tsx`). The import has no runtime consumer on the
// client — its only job is to put `card.module.css` into the client
// environment's module graph so Vite's `hasClientJsImporter` flag
// flips to true for that file. This mirrors the pattern a route file
// uses in frameworks like TanStack Start, where an RSC-owned
// stylesheet is re-declared on the client so Vite's HMR runtime
// tracks it during dev.
import './card.module.css'

export function SharedGraphClientTracker() {
  return null
}
