import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc'
import { Suspense, type ReactNode } from 'react'

async function DynamicImportComponent() {
  const { ImportedComponent } = await import('./imported.tsx')
  return <ImportedComponent />
}

async function SlowServerComponent({ delay }: { delay: number }) {
  await new Promise((resolve) => setTimeout(resolve, delay))
  return <p>SlowServerComponent resolved after {delay}ms</p>
}

function PerformanceProbe({ delay }: { delay: number }) {
  return (
    <div>
      <DynamicImportComponent />
      <Suspense fallback={<p>Waiting for SlowServerComponent...</p>}>
        <SlowServerComponent delay={delay} />
      </Suspense>
    </div>
  )
}

export default function handler(request: Request): Response {
  const url = new URL(request.url)
  const delay = Number(url.searchParams.get('delay')) || 1000
  const stream = renderToReadableStream<ReactNode>(
    <PerformanceProbe delay={delay} />,
  )

  return new Response(stream, {
    headers: {
      'content-type': 'text/x-component;charset=utf-8',
    },
  })
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
