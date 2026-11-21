import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'

test.describe('client reference CSS order', () => {
  const root = 'examples/e2e/temp/client-css-order'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import { defineConfig, mergeConfig } from 'vite'
          import baseConfig from './vite.config.base.ts'

          export default mergeConfig(
            baseConfig,
            defineConfig({
              base: '/custom-base/',
              rsc: {
                clientChunks: (meta) => meta.normalizedId,
              },
            }),
          )
        `,
        'src/badge.css': `
          .badge {
            color: red;
          }
        `,
        'src/badge.tsx': /* js */ `
          import './badge.css'

          export function Badge(props: { className?: string; children: string }) {
            return <span className={'badge ' + (props.className ?? '')}>{props.children}</span>
          }
        `,
        'src/panel.css': `
          .panel-badge {
            color: green;
          }
        `,
        'src/panel.tsx': /* js */ `
          'use client'

          import { Badge } from './badge.tsx'
          import './panel.css'

          export function Panel() {
            return <Badge className="panel-badge">Overridden badge</Badge>
          }
        `,
        'src/default-panel.tsx': /* js */ `
          'use client'

          import { Badge } from './badge.tsx'

          export function DefaultPanel() {
            return <Badge>Default badge</Badge>
          }
        `,
        'src/root.tsx': /* js */ `
          import { Panel } from './panel.tsx'
          import { DefaultPanel } from './default-panel.tsx'

          export function Root() {
            return (
              <html lang="en">
                <body>
                  <Panel />
                  <DefaultPanel />
                </body>
              </html>
            )
          }
        `,
      },
    })
  })

  for (const mode of ['dev', 'build'] as const) {
    test.describe(mode, () => {
      const f = useFixture({ root, mode })

      test('applies dependency CSS before importer CSS', async ({ page }) => {
        await page.goto(f.url('/custom-base/'))

        await expect(page.getByText('Default badge')).toHaveCSS(
          'color',
          'rgb(255, 0, 0)',
        )
        await expect(page.getByText('Overridden badge')).toHaveCSS(
          'color',
          'rgb(0, 128, 0)',
        )
      })
    })
  }
})
