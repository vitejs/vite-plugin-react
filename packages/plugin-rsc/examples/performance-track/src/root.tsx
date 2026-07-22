import { Suspense } from 'react'

async function DynamicImportComponent() {
  const { ImportedComponent } = await import('./imported.tsx')
  return <ImportedComponent />
}

async function SlowServerComponent({ delay }: { delay: number }) {
  await new Promise((resolve) => setTimeout(resolve, delay))
  return <p>SlowServerComponent resolved after {delay}ms</p>
}

export function Root({ url }: { url: URL }) {
  const probe = url.searchParams.get('probe') ?? 'initial'
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>RSC performance track probe</title>
      </head>
      <body>
        <main>
          <h1>RSC performance track probe</h1>
          <p>Probe request: {probe}</p>
          <DynamicImportComponent />
          <Suspense fallback={<p>Waiting for SlowServerComponent...</p>}>
            <SlowServerComponent delay={1000} />
          </Suspense>
          <a href="?probe=on-demand">Load RSC probe</a>
        </main>
      </body>
    </html>
  )
}
