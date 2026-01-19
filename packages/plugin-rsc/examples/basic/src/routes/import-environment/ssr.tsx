import { useState } from 'react'
import { renderToString } from 'react-dom/server'

// SSR-only: useState and renderToString are not available in RSC environment

function ClientComponent() {
  const [state] = useState('test-ssr-module')
  return <>{state}</>
}

export async function testSsrModule() {
  const { testRscModule } = await import.meta.viteRsc.import<
    typeof import('./rsc')
  >('./rsc.tsx', { environment: 'rsc' })
  const value = await testRscModule()
  return renderToString(
    <>
      <ClientComponent />: {value}
    </>,
  )
}
