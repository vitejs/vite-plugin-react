import { createFromFetch } from '@vitejs/plugin-rsc/browser'
import { hydrateRoot } from 'react-dom/client'
import { Root } from '../root'
import { setRscFnCaller, type RscFnCaller } from './runtime'

function main() {
  const callRscFn: RscFnCaller = async (id, args) => {
    return createFromFetch(
      fetch('/__rsc-function', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-rsc-function-id': id,
        },
        body: JSON.stringify(args),
      }),
    )
  }

  setRscFnCaller(callRscFn)

  hydrateRoot(document, <Root />)
}

main()
