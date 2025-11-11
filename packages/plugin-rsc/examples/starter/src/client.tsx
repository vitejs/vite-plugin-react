'use client'

import React from 'react'

export function ClientCounter() {
  const [count, setCount] = React.useState(0)

  return (
    <button onClick={() => setCount((count) => count + 1)}>
      Client Counter: {count}
    </button>
  )
}

export class ErrorBoundary extends React.Component<{
  children: React.ReactNode
}> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      const error = this.state.error
      return (
        <div id="root">
          <p>ErrorBoundary caught an error.</p>
          <pre>Error: {'message' in error ? error.message : '(Unknown)'}</pre>
          <button
            onClick={() => {
              this.setState({ error: undefined })
            }}
          >
            Reset
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
