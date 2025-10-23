import Demo from './demo.mdx'
import Demo2 from './demo2.md'
import React from 'react'
import ReactDOM from 'react-dom/client'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Demo />
    <Demo2 />
  </React.StrictMode>,
)
