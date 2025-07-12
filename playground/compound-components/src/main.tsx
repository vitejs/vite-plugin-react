import React from 'react'
import ReactDOM from 'react-dom/client'
import { Accordion } from './Accordion'

const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
  <React.StrictMode>
    <div>
      <h1>Compound Components HMR Test</h1>
      <p>
        This demonstrates the compound component pattern that causes full reload
        instead of HMR.
      </p>
      <Accordion.Root>
        <Accordion.Item>First Item</Accordion.Item>
        <Accordion.Item>Second Item</Accordion.Item>
      </Accordion.Root>
    </div>
  </React.StrictMode>,
)
