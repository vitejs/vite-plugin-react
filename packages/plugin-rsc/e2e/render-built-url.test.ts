import type { RenderBuiltAssetUrl } from 'vite'

import { expect, test } from '@playwright/test'
import fs from 'node:fs'

import { setupInlineFixture, useFixture } from './fixture'
import { expectNoPageError, waitForHydration } from './helper'
import { defineStarterTest } from './starter'

test.describe(() => {
  const root = 'examples/e2e/temp/renderBuiltUrl-runtime'

  test.beforeAll(async () => {
    const renderBuiltUrl: RenderBuiltAssetUrl = (filename, meta) => {
      if (meta.hostType === 'css') {
        return { relative: true }
      }
      return {
        runtime: `__dynamicBase + ${JSON.stringify(filename)}`,
      }
    }
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.ts': /* js */ `
          import rsc from '@vitejs/plugin-rsc'
          import react from '@vitejs/plugin-react'
          import { defineConfig } from 'vite'

          export default defineConfig({
            plugins: [
              react(),
              rsc({
                entries: {
                  client: './src/framework/entry.browser.tsx',
                  ssr: './src/framework/entry.ssr.tsx',
                  rsc: './src/framework/entry.rsc.tsx',
                }
              }),
              {
                // simulate custom asset server
                name: 'custom-server',
                config(_config, env) {
                  if (env.isPreview) {
                    globalThis.__dynamicBase = '/custom-server/';
                  }
                },
                configurePreviewServer(server) {
                  server.middlewares.use((req, res, next) => {
                    const url = new URL(req.url ?? '', "http://localhost");
                    if (url.pathname.startsWith('/custom-server/')) {
                      req.url = url.pathname.replace('/custom-server/', '/');
                    }
                    next();
                  });
                }
              }
            ],
            // tweak chunks to test "__dynamicBase" used on browser for "__vite__mapDeps"
            environments: {
              client: {
                build: {
                  rollupOptions: {
                    output: {
                      manualChunks: (id) => {
                        if (id.includes('node_modules/react/')) {
                          return 'lib-react';
                        }
                      }
                    },
                  }
                }
              }
            },
            experimental: {
              renderBuiltUrl: ${renderBuiltUrl.toString()}
            },
          })
        `,
        'src/root.tsx': {
          // define __dynamicBase on browser via head script
          edit: (s: string) =>
            s.replace(
              '</head>',
              () =>
                `<script>{\`globalThis.__dynamicBase = $\{JSON.stringify(globalThis.__dynamicBase ?? "/")}\`}</script></head>`,
            ),
        },
      },
    })
  })

  test.describe('dev-renderBuiltUrl-runtime', () => {
    const f = useFixture({ root, mode: 'dev' })

    test('basic', async ({ page }) => {
      using _ = expectNoPageError(page)
      await page.goto(f.url())
      await waitForHydration(page)
    })
  })

  test.describe('build-renderBuiltUrl-runtime', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)

    test('verify runtime url', () => {
      const manifestFileContent = fs.readFileSync(
        f.root + '/dist/ssr/__vite_rsc_assets_manifest.js',
        'utf-8',
      )
      expect(manifestFileContent).toContain(
        `__dynamicBase + "assets/entry.rsc-`,
      )
    })
  })
})

test.describe(() => {
  const root = 'examples/e2e/temp/renderBuiltUrl-string'

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
            plugins: [
              react(),
              rsc({
                entries: {
                  client: './src/framework/entry.browser.tsx',
                  ssr: './src/framework/entry.ssr.tsx',
                  rsc: './src/framework/entry.rsc.tsx',
                }
              }),
              {
                // simulate custom asset server
                name: 'custom-server',
                configurePreviewServer(server) {
                  server.middlewares.use((req, res, next) => {
                    const url = new URL(req.url ?? '', "http://localhost");
                    if (url.pathname.startsWith('/custom-server/')) {
                      req.url = url.pathname.replace('/custom-server/', '/');
                    }
                    next();
                  });
                }
              }
            ],
            experimental: {
              renderBuiltUrl(filename) {
                return '/custom-server/' + filename;
              }
            }
          })
        `,
      },
    })
  })

  test.describe('build-renderBuiltUrl-string', () => {
    const f = useFixture({ root, mode: 'build' })
    defineStarterTest(f)
  })
})
