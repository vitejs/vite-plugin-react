import '@vitejs/plugin-react/preamble'
import ReactDOM from 'react-dom/client'
import { App } from './App'

const container = document.getElementById('app')

if (window.__SSR_ERROR__) {
  // SSR failed: mount fresh via createRoot (CSR fallback).
  // This avoids hydration mismatches when the server sent an empty shell.
  console.warn('[Client] SSR error detected, falling back to CSR')
  const root = ReactDOM.createRoot(container)
  root.render(<App url={new URL(window.location.href)} />)
} else {
  // Normal path: hydrate the server-rendered HTML.
  ReactDOM.hydrateRoot(container, <App url={new URL(window.location.href)} />, {
    onRecoverableError(error, errorInfo) {
      // Hydration mismatches and other recoverable errors surface here.
      // Log them so they are visible during development.
      console.error(
        '[Hydration] Recoverable error:',
        error,
        errorInfo.componentStack ?? '',
      )
    },
  })
}
console.log('mounted')
