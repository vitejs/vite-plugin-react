import reactLogo from './react.svg'
import { TitleWithExport, framework } from './TitleWithExport.tsx'
import './App.css'
import { useState } from 'react'

export const App = () => {
  const [count, setCount] = useState(0)

  return (
    <div>
      <div>
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <TitleWithExport />
      <div className="card">
        <button onClick={() => setCount(count + 1)}>count is {count}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and {framework} logos to learn more
      </p>
    </div>
  )
}
