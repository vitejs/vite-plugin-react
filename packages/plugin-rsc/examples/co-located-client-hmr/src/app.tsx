// No `"use client"` here on purpose: this module is imported directly by the
// browser entry and statically imports the route component, so the import chain
// `entry.browser -> app -> page` contains no client reference. This is the
// pattern a client-side router uses when it imports route components.
import { Page } from './routes/page'

export function App() {
  return <Page />
}
