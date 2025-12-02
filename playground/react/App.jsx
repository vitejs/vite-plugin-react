import Button from 'jsx-entry'
import { useState } from 'react'

import { Accordion } from './components/Accordion'
import WithQuery from './components/WithQuery?qs-should-not-break-plugin-react'
import { ContextButton } from './context/ContextButton'
import { CountProvider } from './context/CountProvider'
import InjectExportsLater from './hmr/inject-exports-later'
import { JsxImportRuntime } from './hmr/jsx-import-runtime'
import Parent from './hmr/parent'
import { TestImportAttributes } from './import-attributes/test'
import { TEST_NON_JSX, TestNonJsx } from './non-jsx/test'

function App() {
  const [count, setCount] = useState(0)
  return (
    <div className="App">
      <header className="App-header">
        <h1>Hello Vite + React</h1>
        <p>
          <button
            id="state-button"
            onClick={() => setCount((count) => count + 1)}
          >
            count is: {count}
          </button>
        </p>
        <p>
          <ContextButton />
        </p>
        <p>
          Edit <code>App.jsx</code> and save to test HMR updates.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>

      <WithQuery />
      <Accordion.Root>
        <Accordion.Item>First Item</Accordion.Item>
        <Accordion.Item>Second Item</Accordion.Item>
      </Accordion.Root>
      <Parent />
      <InjectExportsLater />
      <JsxImportRuntime />
      <Button>button</Button>
      <TestImportAttributes />
      {TestNonJsx()}
      {TEST_NON_JSX()}
    </div>
  )
}

function AppWithProviders() {
  return (
    <CountProvider>
      <App />
    </CountProvider>
  )
}

export default AppWithProviders
