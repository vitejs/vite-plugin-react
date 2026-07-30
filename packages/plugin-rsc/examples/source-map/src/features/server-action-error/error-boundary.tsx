'use client'

import { Component, type ReactNode } from 'react'

export class ActionErrorBoundary extends Component<{ children?: ReactNode }> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <p>Server Action error: {this.state.error.message}</p>
    }
    return this.props.children
  }
}
