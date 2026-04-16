import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { waitForHydration } from './helper'
import { defineStarterTest } from './starter'

// When `build.cssCodeSplit: false`, Vite emits a single consolidated CSS
// bundle asset and no `importedCss` metadata on chunks. The rsc plugin must
// still copy the rsc environment's CSS asset into the client output and
// reference it from server-component resources, otherwise RSC-only CSS
// (e.g. from a server component module) goes missing from the client build.

test.describe('cssCodeSplit-false', () => {
  const root = 'examples/e2e/temp/cssCodeSplit-false'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.ts': /* js */ `
          import rsc from '@vitejs/plugin-rsc'
          import react from '@vitejs/plugin-react'
          import { defineConfig } from 'vite'

          export default defineConfig({
            build: { cssCodeSplit: false },
            plugins: [
              react(),
              rsc({
                entries: {
                  client: './src/framework/entry.browser.tsx',
                  ssr: './src/framework/entry.ssr.tsx',
                  rsc: './src/framework/entry.rsc.tsx',
                }
              }),
            ],
          })
        `,
        // CSS module imported exclusively by a server component module, so its
        // styles only reach the client via plugin-rsc's server-resources <link>
        // path.
        'src/server-only.module.css': /* css */ `
          .serverOnly {
            color: rgb(123, 45, 67);
          }
        `,
        'src/server-only.tsx': /* js */ `
          import styles from './server-only.module.css'
          export function ServerOnly() {
            return <div data-testid="server-only" className={styles.serverOnly}>rsc-css-only</div>
          }
        `,
        'src/root.tsx': {
          edit: (s) =>
            s
              .replace(
                `import { ClientCounter } from './client.tsx'`,
                `import { ClientCounter } from './client.tsx'\nimport { ServerOnly } from './server-only.tsx'`,
              )
              .replace(`<ClientCounter />`, `<ClientCounter /><ServerOnly />`),
        },
      },
    })
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)

    test('rsc-only css is present in the client output', () => {
      const dir = path.join(f.root, 'dist/client/assets')
      const cssFiles = fs.readdirSync(dir).filter((n) => n.endsWith('.css'))
      const combined = cssFiles
        .map((n) => fs.readFileSync(path.join(dir, n), 'utf-8'))
        .join('\n')
      // minifier may hex-encode; accept either form
      expect(combined).toMatch(/rgb\(123,\s*45,\s*67\)|#7b2d43/i)
    })

    test('rsc-only css is applied at runtime', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await expect(page.getByTestId('server-only')).toHaveCSS(
        'color',
        'rgb(123, 45, 67)',
      )
    })
  })
})
