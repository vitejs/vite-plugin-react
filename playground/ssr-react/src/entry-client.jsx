import '@vitejs/plugin-react/preamble'
import { App } from './App'
import ReactDOM from 'react-dom/client'

ReactDOM.hydrateRoot(
  document.getElementById('app'),
  <App url={new URL(window.location.href)} />,
)
console.log('hydrated')
