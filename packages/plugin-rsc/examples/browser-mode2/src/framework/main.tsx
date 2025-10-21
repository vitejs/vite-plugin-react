import loadClient from 'virtual:vite-rsc-browser-mode2/load-client'
import loadServer from 'virtual:vite-rsc-browser-mode2/load-server'

async function main() {
  const [client, server] = await Promise.all([loadClient(), loadServer()])
  client.initialize({ fetchServer: server.fetchServer })
  await client.main()
}

main()
