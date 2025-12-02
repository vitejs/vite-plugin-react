import loadClient from 'virtual:vite-rsc-browser-mode/load-client'

import * as server from './entry.rsc'

async function main() {
  const client = await loadClient()
  server.initialize()
  client.initialize({ fetchServer: server.fetchServer })
  await client.main()
}

main()
