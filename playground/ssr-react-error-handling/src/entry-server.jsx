import React from 'react'
import { renderToReadableStream } from 'react-dom/server'
import { App } from './App'

/**
 * Renders the app to a ReadableStream with error handling.
 *
 * Demonstrates:
 * - onError callback for logging SSR render errors
 * - digest for identifying errors without leaking details to the client
 * - captureOwnerStack for enhanced debugging (React 19+)
 * - SSR-to-CSR fallback when renderToReadableStream fails
 */
export async function render(url) {
  const captureOwnerStack = React.captureOwnerStack

  try {
    const stream = await renderToReadableStream(
      <App url={new URL(url, 'http://localhost')} />,
      {
        onError(error, errorInfo) {
          // Check for a digest property, which React attaches to errors
          // thrown in server components or passed through Suspense boundaries.
          // The digest acts as an opaque identifier: it can be sent to the
          // client without leaking server internals.
          if (
            error &&
            typeof error === 'object' &&
            'digest' in error &&
            typeof error.digest === 'string'
          ) {
            console.error(
              `[SSR] Error with digest "${error.digest}":`,
              error.message,
            )
            return error.digest
          }

          // captureOwnerStack() returns the component stack of the owner
          // that rendered the component where the error originated. This is
          // more useful than errorInfo.componentStack for debugging because
          // it traces the "who rendered this" chain rather than the "where
          // in the tree" chain.
          const ownerStack = captureOwnerStack?.() ?? ''
          console.error(
            '[SSR] Render error:',
            error,
            ownerStack ? `\nOwner stack:\n${ownerStack}` : '',
            errorInfo.componentStack
              ? `\nComponent stack:\n${errorInfo.componentStack}`
              : '',
          )
        },
      },
    )

    return stream
  } catch (error) {
    // If renderToReadableStream itself throws (e.g. the shell fails to
    // render), fall back to a CSR-only shell. The client entry will detect
    // window.__SSR_ERROR__ and use createRoot instead of hydrateRoot.
    console.error('[SSR] Shell render failed, falling back to CSR:', error)
    return `<script>window.__SSR_ERROR__ = true</script>`
  }
}
