import { use, useState } from 'react'
import { createRscFn } from '../framework/runtime'

// TODO: Split this module via query params so browser/SSR retain the caller and
// Page while RSC receives the handler. This temporary export-only transform
// enables Fast Refresh but does not remove the handler from caller bundles.
/* @rsc-only-export */
export const getServerMessage = createRscFn('getServerMessage', async () => (
  <p data-testid="server">server: baseline</p>
))

export function Page() {
  const serverMessage = use(getServerMessage())
  const [count, setCount] = useState(0)

  return (
    <main>
      <h1 data-testid="client">client: baseline</h1>
      {serverMessage}
      <button
        data-testid="count"
        onClick={() => setCount((value) => value + 1)}
      >
        count: {count}
      </button>
    </main>
  )
}
