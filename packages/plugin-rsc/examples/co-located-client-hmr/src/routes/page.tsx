import React from 'react'

// This file is imported by the server root (see `src/root.tsx`) via
// `ServerNote`, so it is present in the `rsc` module graph — mirroring a
// framework route file that co-locates server-graph code (e.g. a server
// function) with its route component.
export function ServerNote() {
  return <p data-testid="server-note">server-note</p>
}

// `Page` is a genuine client-rendered component. It is reached from the browser
// entry through `src/app.tsx` WITHOUT any `"use client"` boundary in the chain
// (like a client router statically importing route components), so on the
// `client` environment `isInsideClientBoundary` is false. Because the file is
// also in the `rsc` graph (above), the client `hotUpdate` guard used to return
// `[]` and suppress this component's Fast Refresh. Editing the marker should
// hot-update while preserving the counter state.
export function Page() {
  const [count, setCount] = React.useState(0)

  return (
    <div data-testid="page">
      <h1 data-testid="marker">marker-baseline</h1>
      <button data-testid="count" onClick={() => setCount((c) => c + 1)}>
        count: {count}
      </button>
    </div>
  )
}
