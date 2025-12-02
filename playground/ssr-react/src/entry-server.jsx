import ReactDOMServer from 'react-dom/server'

import { App } from './App'

export function render(url) {
  return ReactDOMServer.renderToString(
    <App url={new URL(url, 'http://localhost')} />,
  )
}
