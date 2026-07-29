'use client'

import React from 'react'

export function GlobalErrorBoundary(props: { children?: React.ReactNode }) {
  return (
    <ErrorBoundary errorComponent={DefaultGlobalErrorPage}>
      {props.children}
    </ErrorBoundary>
  )
}

class ErrorBoundary extends React.Component<{
  children?: React.ReactNode
  errorComponent: React.FC<{
    error: Error
    reset: () => void
  }>
}> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const error = this.state.error
    if (error) {
      return <this.props.errorComponent error={error} reset={this.reset} />
    }
    return this.props.children
  }
}

function DefaultGlobalErrorPage(props: { error: Error; reset: () => void }) {
  return (
    <html>
      <head>
        <title>Unexpected Error</title>
      </head>
      <body
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          placeContent: 'center',
          placeItems: 'center',
          fontSize: '16px',
          fontWeight: 400,
          lineHeight: '24px',
        }}
      >
        <p>Caught an unexpected error</p>
        <pre>
          Error:{' '}
          {import.meta.env.DEV && 'message' in props.error
            ? props.error.message
            : '(Unknown)'}
        </pre>
        <button
          onClick={() => {
            React.startTransition(() => {
              props.reset()
            })
          }}
        >
          Reset
        </button>
      </body>
    </html>
  )
}
