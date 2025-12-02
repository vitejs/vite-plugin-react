import '@vitejs/plugin-react/preamble'
import ReactDOM from 'react-dom/client'
import { App } from './App'

ReactDOM.hydrateRoot(document.getElementById('app'), <App url={new URL(window.location.href)} />)
console.log('hydrated')
