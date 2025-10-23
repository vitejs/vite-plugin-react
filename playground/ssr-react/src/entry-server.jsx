import { App } from './App'
import ReactDOMServer from 'react-dom/server'

export function render(url) {
  return ReactDOMServer.renderToString(
    <App url={new URL(url, 'http://localhost')} />,
  )
}
