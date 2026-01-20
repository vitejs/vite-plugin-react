import loadClient from 'virtual:vite-rsc-browser-mode/load-client'
import * as server from './entry.rsc'
import { polyfillReady } from './polyfill'

async function main() {
  await polyfillReady
  const client = await loadClient()
  server.initialize()
  client.initialize({ fetchServer: server.fetchServer })
  await client.main()
}

main()
