import ReactDOMClient from 'react-dom/client'
import { Root } from './root'

function main() {
  ReactDOMClient.hydrateRoot(document, <Root />)
}

main()
