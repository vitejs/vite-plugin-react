import * as server from './entry.rsc'
import loadClient from 'virtual:vite-rsc-browser-mode2/load-client'

async function main() {
  const client = await loadClient()
  client.initialize({ fetchServer: server.fetchServer })
  await client.main()
}

main()
