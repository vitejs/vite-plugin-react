import { createRoot } from 'react-dom/client'
import { App } from '../app'

// This example intentionally renders the client app as a CSR island instead of
// hydrating the RSC payload. The server renders a static shell with an empty
// `#client-root` (see `src/root.tsx`); here we statically import `App` (which
// imports the route component in `src/routes/page.tsx`) and mount it.
//
// The point is the import chain `entry.browser -> app -> page` has NO
// `"use client"` boundary, so `page.tsx` enters the client module graph as a
// non-client-reference. Because `page.tsx` is also in the `rsc` module graph
// (the server shell imports `ServerNote` from it), this is exactly the shape
// where the client `hotUpdate` guard used to suppress Fast Refresh.
function main() {
  const el = document.getElementById('client-root')
  if (el) {
    createRoot(el).render(<App />)
  }
}

main()
