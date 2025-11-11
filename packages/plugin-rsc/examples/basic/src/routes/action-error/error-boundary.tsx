'use client'

import * as React from 'react'

export default class ErrorBoundary extends React.Component<{
  children?: React.ReactNode
}> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div data-testid="action-error-boundary">
          ErrorBoundary triggered
          <button
            onClick={() => {
              this.setState({ error: null })
            }}
          >
            reset-error
          </button>
          (<code>Error: {this.state.error.message}</code>)
        </div>
      )
    }
    return this.props.children
  }
}
