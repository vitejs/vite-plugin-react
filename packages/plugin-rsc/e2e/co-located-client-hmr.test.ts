import { expect, test } from '@playwright/test'
import { type Fixture, setupInlineFixture, useFixture } from './fixture'

// Regression test for the client `hotUpdate` guard: a genuine client-rendered
// component that is also present in the `rsc` module graph (because its file
// co-locates server-graph code) must keep Fast Refresh. Before the fix the
// guard returned `[]` for such files and the edit was silently dropped on the
// client.
//
// The fixture sets up the trigger without a framework: the browser entry mounts
// `App` as a CSR island, and the import chain `entry.browser -> app -> page`
// has no `"use client"` boundary, so `Page` enters the client graph as a
// non-client-reference. `page.tsx` is also in the `rsc` graph because the
// server `root.tsx` imports `ServerNote` from it.
test.describe('co-located-client-hmr', () => {
  const root = 'examples/e2e/temp/co-located-client-hmr'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'src/routes/page.tsx': /* tsx */ `
          import React from 'react'

          // Imported by the server 'root.tsx' below, so this file is in the
          // 'rsc' module graph -- like a route file co-locating server-graph
          // code with its route component.
          export function ServerNote() {
            return <p data-testid="server-note">server-note</p>
          }

          // Client-rendered route component, reached from the browser entry via
          // 'app.tsx' with no "use client" boundary in the chain.
          export function Page() {
            const [count, setCount] = React.useState(0)
            return (
              <div data-testid="page">
                <h1 data-testid="marker">marker-baseline</h1>
                <button data-testid="count" onClick={() => setCount((c) => c + 1)}>
                  count: {count}
                </button>
              </div>
            )
          }
        `,
        'src/app.tsx': /* tsx */ `
          // No "use client": this module is imported directly by the browser
          // entry and statically imports the route component, so the chain
          // 'entry.browser -> app -> page' contains no client reference.
          import { Page } from './routes/page'

          export function App() {
            return <Page />
          }
        `,
        'src/root.tsx': /* tsx */ `
          import { ServerNote } from './routes/page'

          // Server shell. Importing 'ServerNote' puts 'routes/page' into the
          // 'rsc' module graph. 'Page' itself is mounted client-side into
          // '#client-root' by the browser entry, not rendered here.
          export function Root(_props: { url: URL }) {
            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                </head>
                <body>
                  <div id="client-root" />
                  <ServerNote />
                </body>
              </html>
            )
          }
        `,
        'src/framework/entry.browser.tsx': /* tsx */ `
          import { createRoot } from 'react-dom/client'
          import { App } from '../app'

          // Render the client app as a CSR island instead of hydrating the RSC
          // payload, so 'Page' is a client-rendered, non-"use client" component.
          const el = document.getElementById('client-root')
          if (el) {
            createRoot(el).render(<App />)
          }
        `,
      },
    })
  })

  function defineTest(f: Fixture) {
    test('route component co-located with rsc-graph code hot-updates', async ({
      page,
    }) => {
      await page.goto(f.url())

      const marker = page.getByTestId('marker')
      const count = page.getByTestId('count')
      await expect(marker).toHaveText('marker-baseline')

      // seed client state to prove the edit is a Fast Refresh, not a reload
      await count.click()
      await count.click()
      await expect(count).toHaveText('count: 2')

      const editor = f.createEditor('src/routes/page.tsx')
      editor.edit((s) => s.replace('marker-baseline', 'marker-edited'))
      await expect(marker).toHaveText('marker-edited')
      await expect(count).toHaveText('count: 2')

      editor.reset()
      await expect(marker).toHaveText('marker-baseline')
      await expect(count).toHaveText('count: 2')
    })
  }

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineTest(f)
  })
})
