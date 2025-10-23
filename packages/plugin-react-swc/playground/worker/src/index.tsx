import { App } from './App.tsx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

new Worker(new URL('./worker-via-url.ts', import.meta.url), { type: 'module' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
