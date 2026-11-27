import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { getPluginApi } from '@vitejs/plugin-rsc'
import { createBuilder } from 'vite'
import { setupInlineFixture, useFixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'

test.describe(() => {
  const root = 'examples/e2e/temp/client-action-discovery'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import path from 'node:path'
          import config from './vite.config.base'
          for (const { build } of Object.values(config.environments)) {
            build.rollupOptions.input.index = path.resolve(import.meta.dirname, build.rollupOptions.input.index)
          }
          export default config
        `,
        'src/root.tsx': /* tsx */ `
          export function Root() {
            return <html lang="en"><head><meta charSet="UTF-8" /></head><body>
              <h1>Client action discovery</h1>
              <section id="discovery" />
            </body></html>
          }
        `,
        'src/framework/entry.browser.tsx': {
          edit: (source) =>
            source +
            /* tsx */ `
            import { outerAction } from '../discovery/outer-action'
            Object.assign(globalThis, {
              async mountDiscoveredAction() {
                const result = await outerAction()
                createRoot(document.getElementById('discovery')!).render(result)
              },
            })
          `,
        },
        'src/discovery/outer-action.tsx': /* tsx */ `
          'use server'
          import { OuterClient } from './outer-client'
          export async function outerAction() {
            return <OuterClient />
          }
        `,
        'src/discovery/outer-client.tsx': /* tsx */ `
          'use client'
          import { useState, type ReactNode } from 'react'
          import { middleAction } from './middle-action'
          export function OuterClient() {
            const [result, setResult] = useState<ReactNode>()
            return <>
              <button onClick={async () => setResult(await middleAction())}>Run nested action</button>
              {result}
            </>
          }
        `,
        'src/discovery/middle-action.tsx': /* tsx */ `
          'use server'
          import { InnerClient } from './inner-client'
          export async function middleAction() {
            return <InnerClient />
          }
        `,
        'src/discovery/inner-client.tsx': /* tsx */ `
          'use client'
          import { useState } from 'react'
          import { finalAction } from './final-action'
          import './inner.css'
          export function InnerClient() {
            const [result, setResult] = useState('pending')
            return <>
              <button onClick={async () => setResult(await finalAction())}>Run final action</button>
              <output className="discovered-result">{result}</output>
            </>
          }
        `,
        'src/discovery/inner.css':
          '.discovered-result { color: rgb(17, 34, 51) }',
        'src/discovery/final-action.tsx': /* tsx */ `
          'use server'
          import { outerAction } from './outer-action'
          export async function finalAction() {
            return typeof outerAction === 'function' ? 'complete' : 'missing'
          }
        `,
      },
    })
  })

  for (const mode of ['dev', 'build'] as const) {
    test.describe(mode, () => {
      const f = useFixture({ root, mode })

      test('discovers alternating client and server boundaries from the browser entry', async ({
        page,
      }) => {
        using _ = expectNoPageError(page)
        await page.goto(f.url())
        await waitForHydration(page)
        await page.evaluate(async () => {
          await (globalThis as any).mountDiscoveredAction()
        })
        await page.getByRole('button', { name: 'Run nested action' }).click()
        await page.getByRole('button', { name: 'Run final action' }).click()
        await expect(page.getByRole('status')).toHaveText('complete')
        await expect(page.getByRole('status')).toHaveCSS(
          'color',
          'rgb(17, 34, 51)',
        )
      })
    })
  }

  for (const failedEnvironment of ['rsc', 'ssr', 'client']) {
    test(`restores scan state after a ${failedEnvironment} failure and can retry`, async () => {
      let failNextScan = true
      const outDir = `dist-failed-${failedEnvironment}`
      const builder = await createBuilder({
        root: path.resolve(root),
        logLevel: 'silent',
        environments: Object.fromEntries(
          ['rsc', 'ssr', 'client'].map((name) => [
            name,
            {
              build: { outDir: `${outDir}/${name}` },
            },
          ]),
        ),
        plugins: [
          {
            name: 'fail-reference-scan',
            generateBundle() {
              if (
                this.environment.name === failedEnvironment &&
                getPluginApi(this.environment.config)!.manager.isScanBuild &&
                failNextScan
              ) {
                failNextScan = false
                throw new Error('reference scan interrupted')
              }
            },
          },
        ],
      })
      const writes = Object.values(builder.environments).map(
        (environment) => [environment, environment.config.build.write] as const,
      )
      await expect(builder.buildApp()).rejects.toThrow(
        'reference scan interrupted',
      )
      expect(getPluginApi(builder.config)!.manager.isScanBuild).toBe(false)
      for (const [environment, write] of writes) {
        expect(environment.config.build.write).toBe(write)
      }
      expect(fs.existsSync(path.join(root, outDir))).toBe(false)
      await builder.buildApp()
      expect(fs.existsSync(path.join(root, outDir, 'rsc/index.js'))).toBe(true)
      expect(fs.existsSync(path.join(root, outDir, 'ssr/index.js'))).toBe(true)
    })
  }
})
