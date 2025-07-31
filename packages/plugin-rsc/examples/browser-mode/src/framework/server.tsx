import { renderToReadableStream } from '@vitejs/plugin-rsc/react/rsc'
import type React from 'react'
import { ESModulesEvaluator, ModuleRunner } from 'vite/module-runner'

export type RscPayload = {
  root: React.ReactNode
}

async function main() {
  const rscRoot = (
    <div>
      <h1>RSC Browser Mode</h1>
    </div>
  )
  const rscStream = renderToReadableStream<RscPayload>({
    root: rscRoot,
  })

  const clientRunner = createClientRunner()
  const clientEntry = await clientRunner.import<typeof import('./client')>(
    '/src/framework/client.tsx',
  )
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
