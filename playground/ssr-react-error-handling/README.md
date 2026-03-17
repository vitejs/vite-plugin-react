# SSR Error Handling Example

Demonstrates common error handling patterns for React 19 SSR with Vite.

## Patterns covered

### 1. `onError` callback (`entry-server.jsx`)

The `onError` option on `renderToReadableStream` fires whenever a component
throws during server rendering. Use it to log errors, report to monitoring,
or return a digest string to the client.

```js
const stream = await renderToReadableStream(<App />, {
  onError(error, errorInfo) {
    console.error('[SSR]', error, errorInfo.componentStack)
  },
})
```

### 2. `digest` for error identification

When a thrown error has a `digest` property, React forwards it to the client
error boundary without exposing the full error message. This lets you
correlate server and client errors using an opaque ID.

```js
onError(error) {
  if (error?.digest) {
    return error.digest // sent to client
  }
}
```

### 3. `captureOwnerStack` for debugging (React 19+)

`React.captureOwnerStack()` returns the component stack of the _owner_ that
rendered the failing component. This is often more useful than the regular
component stack for tracking down who passed bad props.

```js
import React from 'react'

onError(error) {
  const ownerStack = React.captureOwnerStack?.()
  console.error('[SSR]', error, ownerStack)
}
```

### 4. SSR-to-CSR fallback (`entry-server.jsx` + `entry-client.jsx`)

If `renderToReadableStream` itself throws (the shell fails to render), the
server returns a minimal HTML page with `window.__SSR_ERROR__ = true`. The
client entry detects this flag and calls `createRoot` instead of
`hydrateRoot`, mounting the app from scratch on the client.

### 5. `onRecoverableError` on the client (`entry-client.jsx`)

Hydration mismatches and other non-fatal errors surface through the
`onRecoverableError` callback on `hydrateRoot`. This is the right place to
log warnings without crashing the app.

## Pages

| Route            | Behavior                                                  |
| ---------------- | --------------------------------------------------------- |
| `/`              | Home page with links to error scenarios                   |
| `/throws-render` | Throws during render (SSR + CSR), caught by ErrorBoundary |
| `/throws-effect` | Renders on server, throws in useEffect on client          |

## Running

```bash
# from repo root
pnpm install
pnpm --filter @vitejs/test-ssr-react-error-handling dev
```
