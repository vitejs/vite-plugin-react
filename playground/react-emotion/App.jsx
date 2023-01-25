import { useState } from 'react'
import _Switch from 'react-switch'
import { Counter, StyledCode } from './Counter'
const Switch = _Switch.default || _Switch

function FragmentTest() {
  const [checked, setChecked] = useState(false)
  return (
    <>
      <Switch checked={checked} onChange={setChecked} />
      <p>
        <Counter />
      </p>
    </>
  )
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Hello Vite + React + @emotion/react</h1>
        <FragmentTest />
        <p>
          Edit <StyledCode>App.jsx</StyledCode> and save to test HMR updates.
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
    </div>
  )
}

export default App
