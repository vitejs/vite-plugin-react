import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'

test.describe('getClientEntryUrl', () => {
  const root = 'examples/e2e/temp/client-entry-url'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'src/framework/entry.ssr.tsx': /* tsx */ `
          import { getClientEntryUrl } from '@vitejs/plugin-rsc/ssr'

          export async function renderHTML() {
            const clientEntryUrl = getClientEntryUrl()
            const legacyBootstrapScriptContent =
              await import.meta.viteRsc.loadBootstrapScriptContent('index')
            const content = JSON.stringify({
              clientEntryUrl,
              legacyBootstrapScriptContent,
            })
            return { stream: new Response(content).body! }
          }
        `,
      },
    })
  })

  function defineTest(mode: 'dev' | 'build') {
    const f = useFixture({ root, mode })

    test('returns the client entry URL', async ({ request }) => {
      const response = await request.get(f.url())
      const result = await response.json()
      expect(result.legacyBootstrapScriptContent).toBe(
        `import(${JSON.stringify(result.clientEntryUrl)})`,
      )
      if (mode === 'dev') {
        expect(result.clientEntryUrl).toContain(
          '/@id/__x00__virtual:vite-rsc/entry-browser',
        )
      } else {
        expect(result.clientEntryUrl).toMatch(/\/assets\/index-[\w-]+\.js$/)
      }
    })
  }

  test.describe('dev', () => defineTest('dev'))
  test.describe('build', () => defineTest('build'))
})

test.describe('getClientEntryUrl with customClientEntry', () => {
  const root = 'examples/e2e/temp/client-entry-url-custom'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'vite.config.ts': {
          edit: (source) =>
            source.replace('rsc()', 'rsc({ customClientEntry: true })'),
        },
        'src/framework/entry.ssr.tsx': /* tsx */ `
          import { getClientEntryUrl } from '@vitejs/plugin-rsc/ssr'

          export async function renderHTML() {
            let content = 'unexpected success'
            try {
              getClientEntryUrl()
            } catch (error) {
              content = String(error)
            }
            return { stream: new Response(content).body! }
          }
        `,
      },
    })
  })

  const f = useFixture({ root, mode: 'build' })

  test('throws with customClientEntry', async ({ request }) => {
    const response = await request.get(f.url())
    await expect(response.text()).resolves.toContain(
      `[vite-rsc] getClientEntryUrl() cannot be used with the 'customClientEntry' option`,
    )
  })
})
