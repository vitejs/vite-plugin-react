import * as client from './entry.browser'
import loadRsc from 'virtual:vite-rsc-browser-mode2/load-rsc'

async function main() {
  const rsc = await loadRsc()
  rsc.initialize()
  client.initialize({ fetchRsc: rsc.default })
  await client.main()
}

main()
