import './index.css'
import viteLogo from '/vite.svg'
import { getServerCounter, updateServerCounter } from './action.tsx'
import reactLogo from './assets/react.svg'
import { ClientCounter } from './client.tsx'
import { TestUseActionState } from './action-from-client/client.tsx'
import { TestActionBind } from './action-bind/server.tsx'

export function Root() {
  return <App />
}

function App() {
  return (
    <div id="root">
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a
          href="https://react.dev/reference/rsc/server-components"
          target="_blank"
        >
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + RSC</h1>
      <div className="card">
        <ClientCounter />
      </div>
      <div className="card">
        <form action={updateServerCounter.bind(null, 1)}>
          <button>Server Counter: {getServerCounter()}</button>
        </form>
      </div>
      <div className="card">
        <TestUseActionState />
      </div>
      <div className="card">
        <TestActionBind />
      </div>
    </div>
  )
}
