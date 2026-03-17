import React from 'react'

/**
 * A basic error boundary that catches render errors in its subtree.
 *
 * During SSR, React cannot run error boundaries (they are a client-only
 * mechanism). If a component throws during SSR, the error is reported
 * through renderToReadableStream's onError callback. When the same
 * component throws during hydration or CSR, this boundary catches it and
 * renders the fallback UI.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      '[ErrorBoundary] Caught:',
      error,
      errorInfo.componentStack ?? '',
    )
  }

  render() {
    if (this.state.error) {
      // Display a minimal fallback. In production you would show a
      // user-friendly message and optionally a "retry" button.
      return (
        <div className="error-fallback" data-testid="error-fallback">
          <h2>Something went wrong</h2>
          <pre>{this.state.error.message}</pre>
          {this.state.error.digest && (
            <p>
              Error ID: <code>{this.state.error.digest}</code>
            </p>
          )}
          <button onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
