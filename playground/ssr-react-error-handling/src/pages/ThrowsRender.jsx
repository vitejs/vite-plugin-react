/**
 * A component that always throws during render.
 *
 * During SSR, this error is reported through the `onError` callback passed
 * to `renderToReadableStream`. The stream is still sent to the client, and
 * the ErrorBoundary catches the re-thrown error during hydration/CSR.
 *
 * The error includes a `digest` property that can be used to identify the
 * error on the client side without leaking server details.
 */
export default function ThrowsRender() {
  const error = new Error('Intentional render error')
  error.digest = 'RENDER_ERROR_001'
  throw error
}
