import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'
import { defineStarterTest } from './starter'

test.describe('cssCodeSplit-false', () => {
  const root = 'examples/e2e/temp/cssCodeSplit-false'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import { defineConfig, mergeConfig } from 'vite'
          import baseConfig from './vite.config.base.ts'

          const overrideConfig = defineConfig({
            build: {
              cssCodeSplit: false,
            },
          })

          export default mergeConfig(baseConfig, overrideConfig)
        `,
        // test server css module too
        // (starter example already tests normal server css)
        'src/server-only.module.css': /* css */ `
          .serverOnly {
            color: rgb(123, 45, 67);
          }
        `,
        'src/server-only.tsx': /* js */ `
          import styles from './server-only.module.css'
          export function ServerOnly() {
            return (
              <button data-testid="server-only" className={styles.serverOnly}>
                server-only
              </button>
            )
          }
        `,
        'src/root.tsx': {
          edit: (s) =>
            s
              .replace(
                `import { ClientCounter } from './client.tsx'`,
                `import { ClientCounter } from './client.tsx';
                 import { ServerOnly } from './server-only.tsx'`,
              )
              .replace(`<ClientCounter />`, `<ClientCounter /><ServerOnly />`),
        },
      },
    })
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)

    test('server css module', async ({ page }) => {
      await page.goto(f.url())
      await expect(page.getByTestId('server-only')).toHaveCSS(
        'color',
        'rgb(123, 45, 67)',
      )
    })
  })
})
