import {
  renderToReadableStream,
  setRequireModule,
} from '@vitejs/plugin-rsc/react/rsc'
import type React from 'react'
import { ESModulesEvaluator, ModuleRunner } from 'vite/module-runner'
import { Root } from '../root'

export type RscPayload = {
  root: React.ReactNode
}

function initialize() {
  setRequireModule({ load: (id) => import(/* @vite-ignore */ id) })
}

async function main() {
  initialize()

  const rscStream = renderToReadableStream<RscPayload>({
    root: <Root />,
  })

  const clientRunner = createClientRunner()
  const clientEntry = await clientRunner.import<typeof import('./client')>(
    '/src/framework/client.tsx',
  )
  clientEntry.initialize()
  clientEntry.render(rscStream)
}

function createClientRunner() {
  const runner = new ModuleRunner(
    {
      sourcemapInterceptor: false,
      transport: {
        invoke: async (payload) => {
          const response = await fetch(
            '/@vite/invoke-react-client?' +
              new URLSearchParams({
                data: JSON.stringify(payload),
              }),
          )
          return response.json()
        },
      },
      hmr: false,
    },
    new ESModulesEvaluator(),
  )
  return runner
}

main()
