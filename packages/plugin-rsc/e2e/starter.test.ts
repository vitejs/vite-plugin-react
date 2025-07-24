import { expect, test } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import {
  expectNoPageError,
  expectNoReload,
  testNoJs,
  waitForHydration as waitForHydration_,
} from './helper'
import path from 'node:path'
import fs from 'node:fs'

test.describe('dev-default', () => {
  const f = useFixture({ root: 'examples/starter', mode: 'dev' })
  defineTest(f)
})

test.describe('build-default', () => {
  const f = useFixture({ root: 'examples/starter', mode: 'build' })
  defineTest(f)
})

test.describe('dev-cloudflare', () => {
  const f = useFixture({ root: 'examples/starter-cf-single', mode: 'dev' })
  defineTest(f)
})

test.describe('build-cloudflare', () => {
  const f = useFixture({ root: 'examples/starter-cf-single', mode: 'build' })
  defineTest(f)
})

test.describe('dev-no-ssr', () => {
  const f = useFixture({ root: 'examples/no-ssr', mode: 'dev' })
  defineTest(f, 'no-ssr')
})

test.describe('build-no-ssr', () => {
  const f = useFixture({ root: 'examples/no-ssr', mode: 'build' })
  defineTest(f, 'no-ssr')

  test('no ssr build', () => {
    expect(fs.existsSync(path.join(f.root, 'dist/ssr'))).toBe(false)
  })
})

test.describe('dev-production', () => {
  const f = useFixture({
    root: 'examples/starter',
    mode: 'dev',
    cliOptions: {
      env: { NODE_ENV: 'production' },
    },
  })
  defineTest(f, 'dev-production')

  test('verify production', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration_(page)
    const res = await page.request.get(f.url('src/client.tsx'))
    expect(await res.text()).not.toContain('jsxDEV')
  })
})

test.describe('build-development', () => {
  const f = useFixture({
    root: 'examples/starter',
    mode: 'build',
    cliOptions: {
      env: { NODE_ENV: 'development' },
    },
  })
  defineTest(f)

  test('verify development', async ({ page }) => {
    let output!: string
    page.on('response', async (response) => {
      if (response.url().match(/\/assets\/client-[\w-]+\.js$/)) {
        output = await response.text()
      }
    })
    await page.goto(f.url())
    await waitForHydration_(page)
    expect(output).toContain('jsxDEV')
  })
})

test.describe(() => {
  const root = 'examples/e2e/temp/react-compiler'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import rsc from '@vitejs/plugin-rsc'
          import react from '@vitejs/plugin-react'
          import { defineConfig, mergeConfig } from 'vite'
          import baseConfig from './vite.config.base.ts'
          
          delete baseConfig.plugins

          const overrideConfig = defineConfig({
            plugins: [
              react({
                babel: { plugins: ['babel-plugin-react-compiler'] },
              }).map((p) => ({
                ...p,
                applyToEnvironment: (e) => e.name === 'client',
              })),
              rsc(),
            ],
          })

          export default mergeConfig(baseConfig, overrideConfig)
        `,
      },
    })
  })

  test.describe('dev-react-compiler', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineTest(f)

    test('verify react compiler', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration_(page)
      const res = await page.request.get(f.url('src/client.tsx'))
      expect(await res.text()).toContain('react.memo_cache_sentinel')
    })
  })

  test.describe('build-react-compiler', () => {
    const f = useFixture({ root, mode: 'build' })
    defineTest(f)
  })
})

test.describe(() => {
  const root = 'examples/e2e/temp/base'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import { defineConfig, mergeConfig } from 'vite'
          import baseConfig from './vite.config.base.ts'

          const overrideConfig = defineConfig({
            base: '/custom-base/',
          })

          export default mergeConfig(baseConfig, overrideConfig)
        `,
      },
    })
  })

  test.describe('dev-base', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineTest({
      ...f,
      url: (url) => new URL(url ?? './', f.url('./custom-base/')).href,
    })
  })

  test.describe('build-base', () => {
    const f = useFixture({ root, mode: 'build' })
    defineTest({
      ...f,
      url: (url) => new URL(url ?? './', f.url('./custom-base/')).href,
    })
  })
})

test.describe(() => {
  const root = 'examples/e2e/temp/module-runner-hmr-false'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
      files: {
        'vite.config.base.ts': { cp: 'vite.config.ts' },
        'vite.config.ts': /* js */ `
          import { defineConfig, mergeConfig, createRunnableDevEnvironment } from 'vite'
          import baseConfig from './vite.config.base.ts'

          const overrideConfig = defineConfig({
            environments: {
              ssr: {
                dev: {
                  createEnvironment(name, config) {
                    return createRunnableDevEnvironment(name, config, {
                      runnerOptions: {
                        hmr: false,
                      },
                    })
                  },
                },
              },
              rsc: {
                dev: {
                  createEnvironment(name, config) {
                    return createRunnableDevEnvironment(name, config, {
                      runnerOptions: {
                        hmr: false,
                      },
                    })
                  },
                },
              },
            },
          })

          export default mergeConfig(baseConfig, overrideConfig)
        `,
      },
    })
  })

  test.describe('dev-module-runner-hmr-false', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineTest(f)
  })
})

test.describe(() => {
  const root = 'examples/e2e/temp/renderBuiltUrl-runtime'

  test.beforeAll(async () => {
    const renderBuiltUrl = (filename: string) => {
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
      await waitForHydration_(page)
    })
  })

  test.describe('build-renderBuiltUrl-runtime', () => {
    const f = useFixture({ root, mode: 'build' })
    defineTest(f)

    test('verify runtime url', () => {
      const manifestFileContent = fs.readFileSync(
        f.root + '/dist/ssr/__vite_rsc_assets_manifest.js',
        'utf-8',
      )
      expect(manifestFileContent).toContain(`__dynamicBase + "assets/client-`)
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
    defineTest(f)
  })
})

function defineTest(f: Fixture, variant?: 'no-ssr' | 'dev-production') {
  const waitForHydration: typeof waitForHydration_ = (page) =>
    waitForHydration_(page, variant === 'no-ssr' ? '#root' : 'body')

  test('basic', async ({ page }) => {
    using _ = expectNoPageError(page)
    await page.goto(f.url())
    await waitForHydration(page)
  })

  test('client component', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Client Counter: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'Client Counter: 1' }),
    ).toBeVisible()
  })

  test('server action @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await using _ = await expectNoReload(page)
    await page.getByRole('button', { name: 'Server Counter: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'Server Counter: 1' }),
    ).toBeVisible()
  })

  testNoJs('server action @nojs', async ({ page }) => {
    test.skip(variant === 'no-ssr')

    await page.goto(f.url())
    await page.getByRole('button', { name: 'Server Counter: 1' }).click()
    await expect(
      page.getByRole('button', { name: 'Server Counter: 2' }),
    ).toBeVisible()
  })

  test('client hmr', async ({ page }) => {
    test.skip(f.mode === 'build' || variant === 'dev-production')

    await page.goto(f.url())
    await waitForHydration(page)
    await page.getByRole('button', { name: 'Client Counter: 0' }).click()
    await expect(
      page.getByRole('button', { name: 'Client Counter: 1' }),
    ).toBeVisible()

    const editor = f.createEditor(`src/client.tsx`)
    editor.edit((s) => s.replace('Client Counter', 'Client [edit] Counter'))
    await expect(
      page.getByRole('button', { name: 'Client [edit] Counter: 1' }),
    ).toBeVisible()

    if (variant === 'no-ssr') {
      editor.reset()
      await page.getByRole('button', { name: 'Client Counter: 1' }).click()
      return
    }

    // check next ssr is also updated
    const res = await page.goto(f.url())
    expect(await res?.text()).toContain('Client [edit] Counter')
    await waitForHydration(page)
    editor.reset()
    await page.getByRole('button', { name: 'Client Counter: 0' }).click()
  })

  test.describe(() => {
    test.skip(f.mode === 'build')

    test('server hmr', async ({ page }) => {
      await page.goto(f.url())
      await waitForHydration(page)
      await using _ = await expectNoReload(page)
      await expect(page.getByText('Vite + RSC')).toBeVisible()
      const editor = f.createEditor('src/root.tsx')
      editor.edit((s) =>
        s.replace('<h1>Vite + RSC</h1>', '<h1>Vite x RSC</h1>'),
      )
      await expect(page.getByText('Vite x RSC')).toBeVisible()
      editor.reset()
      await expect(page.getByText('Vite + RSC')).toBeVisible()
    })
  })

  test('image assets', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.getByAltText('Vite logo')).not.toHaveJSProperty(
      'naturalWidth',
      0,
    )
    await expect(page.getByAltText('React logo')).not.toHaveJSProperty(
      'naturalWidth',
      0,
    )
  })

  test('css @js', async ({ page }) => {
    await page.goto(f.url())
    await waitForHydration(page)
    await expect(page.locator('.read-the-docs')).toHaveCSS(
      'color',
      'rgb(136, 136, 136)',
    )
  })

  test.describe(() => {
    test.skip(variant === 'no-ssr')

    testNoJs('css @nojs', async ({ page }) => {
      await page.goto(f.url())
      await expect(page.locator('.read-the-docs')).toHaveCSS(
        'color',
        'rgb(136, 136, 136)',
      )
    })
  })
}
