import { createServer as createHttpServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import react from '@vitejs/plugin-react'
import fs from 'fs-extra'
import { createLogger, createServer } from 'vite'
import { describe, expect, onTestFinished, test } from 'vitest'
import { browser, editFile, isServe, page, testDir } from '~utils'

test('should render', async () => {
  // In bundled dev mode, the page initially shows a "Bundling in progress"
  // placeholder and reloads once the bundle is ready.
  await expect.poll(() => page.textContent('h1')).toMatch('Hello Vite + React')
})

test('should update', async () => {
  expect(await page.textContent('#state-button')).toMatch('count is: 0')
  await page.click('#state-button')
  expect(await page.textContent('#state-button')).toMatch('count is: 1')
})

test.runIf(isServe)(
  'serves the shared refresh runtime as JavaScript',
  async () => {
    const runtimeUrl = new URL('@react-refresh', page.url()).href
    const response = await page.request.get(`${runtimeUrl}?t=1700000000000`)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('javascript')

    // The bundle already imported this URL; an external consumer must reuse it.
    // A string keeps Vitest's SSR transform from rewriting the browser import.
    const runtime = await page.evaluate(`(async () => {
    const countRequests = () => performance.getEntriesByType('resource').filter((entry) =>
      entry.name === ${JSON.stringify(runtimeUrl)},
    ).length
    const requestsBeforeImport = countRequests()
    const runtime = await import(${JSON.stringify(runtimeUrl)})
    return {
      register: typeof runtime.register,
      injectIntoGlobalHook: typeof runtime.injectIntoGlobalHook,
      requestsBeforeImport,
      requestsAfterImport: countRequests(),
    }
  })()`)
    expect(runtime).toEqual({
      register: 'function',
      injectIntoGlobalHook: 'function',
      requestsBeforeImport: 1,
      requestsAfterImport: 1,
    })

    const head = await page.request.head(runtimeUrl)
    expect(head.status()).toBe(200)
    expect(head.headers()['content-type']).toContain('javascript')
    expect(await head.body()).toHaveLength(0)
  },
)

describe.runIf(isServe)('initial refresh runtime requests', () => {
  test.each([false, true])(
    'serves independently of the app build (fails: %s)',
    async (fails) => {
      let finishBuild!: () => void
      const buildReady = new Promise<void>((resolve) => {
        finishBuild = resolve
      })
      let buildFailed = false
      const server = await createServer({
        configFile: false,
        root: testDir,
        logLevel: 'silent',
        customLogger: {
          ...createLogger('silent'),
          error(_message, options) {
            if (options?.error?.message.includes('initial bundle failed')) {
              buildFailed = true
            }
          },
        },
        experimental: { bundledDev: true },
        server: {
          host: '127.0.0.1',
          port: 0,
          headers: { 'X-Test-Runtime': 'shared' },
        },
        plugins: [
          {
            name: 'delay-initial-build',
            enforce: 'pre',
            async buildStart() {
              await buildReady
              if (fails) throw new Error('initial bundle failed')
            },
          },
          react(),
        ],
      })
      onTestFinished(async () => {
        finishBuild()
        await server.close()
      })
      await server.listen()

      const { port } = server.httpServer!.address() as AddressInfo
      const response = await fetch(`http://127.0.0.1:${port}/@react-refresh`)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('javascript')
      expect(response.headers.get('cache-control')).toBe('no-cache')
      expect(response.headers.get('x-test-runtime')).toBe('shared')
      expect(await response.text()).toContain('export function register')

      // A consumer on another origin has no Rolldown runtime of its own.
      const consumerServer = createHttpServer((_req, res) => {
        res.setHeader('Content-Type', 'text/html')
        res.end('<!doctype html><title>Runtime consumer</title>')
      })
      onTestFinished(
        () =>
          new Promise<void>((resolve) => consumerServer.close(() => resolve())),
      )
      await new Promise<void>((resolve) =>
        consumerServer.listen(0, '127.0.0.1', resolve),
      )
      const consumerPort = (consumerServer.address() as AddressInfo).port
      const consumer = await browser.newPage()
      onTestFinished(() => consumer.close())
      await consumer.goto(`http://127.0.0.1:${consumerPort}`)
      const runtimeUrl = `http://127.0.0.1:${port}/@react-refresh`
      const imported = await consumer.evaluate(`(async () => {
      const runtime = await import(${JSON.stringify(runtimeUrl)})
      return {
        register: typeof runtime.register,
        hasBundledRuntime: '__rolldown_runtime__' in globalThis,
      }
    })()`)
      expect(imported).toEqual({
        register: 'function',
        hasBundledRuntime: false,
      })

      finishBuild()
      if (fails) {
        await expect.poll(() => buildFailed).toBe(true)
        const afterError = await fetch(
          `http://127.0.0.1:${port}/@react-refresh`,
        )
        expect(afterError.status).toBe(200)
        expect(afterError.headers.get('content-type')).toContain('javascript')
      }
    },
  )
})

test.runIf(isServe)(
  'shares reactRefreshHost and preserves remote state',
  async () => {
    const hostUrl = page.url().replace(/\/$/, '')
    const remoteRoot = testDir + '-remote'
    fs.copySync(testDir, remoteRoot)
    onTestFinished(() => fs.removeSync(remoteRoot))
    const remote = await createServer({
      configFile: false,
      root: remoteRoot,
      logLevel: 'silent',
      experimental: { bundledDev: true },
      server: {
        host: '127.0.0.1',
        port: 0,
        watch: { usePolling: true, interval: 100 },
      },
      plugins: [react({ reactRefreshHost: hostUrl })],
    })
    onTestFinished(() => remote.close())
    const consumer = await browser.newPage()
    const errors: Error[] = []
    consumer.on('pageerror', (error) => errors.push(error))
    onTestFinished(() => consumer.close())
    await remote.listen()
    const { port } = remote.httpServer!.address() as AddressInfo
    await consumer.goto(`http://127.0.0.1:${port}`)
    await expect
      .poll(() => consumer.textContent('h1'))
      .toMatch('Hello Vite + React')
    const runtimeUrls = await consumer.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter((entry) => entry.name.includes('@react-refresh'))
        .map((entry) => entry.name),
    )
    expect(runtimeUrls).toEqual([`${hostUrl}/@react-refresh`])

    await consumer.click('#state-button')
    expect(await consumer.textContent('#state-button')).toMatch('count is: 1')
    const appFile = remoteRoot + '/src/App.tsx'
    fs.writeFileSync(
      appFile,
      fs
        .readFileSync(appFile, 'utf-8')
        .replace('Vite + React', 'Remote Updated'),
    )
    await expect
      .poll(() => consumer.textContent('h1'))
      .toMatch('Remote Updated')
    expect(await consumer.textContent('#state-button')).toMatch('count is: 1')
    expect(errors).toEqual([])
  },
)

test.runIf(isServe)('should hmr', async () => {
  editFile('src/App.tsx', (code) =>
    code.replace('Vite + React', 'Vite + React Updated'),
  )
  await expect
    .poll(() => page.textContent('h1'))
    .toMatch('Hello Vite + React Updated')
  // preserve state
  expect(await page.textContent('#state-button')).toMatch('count is: 1')

  editFile('src/App.tsx', (code) =>
    code.replace('Vite + React Updated', 'Vite + React'),
  )
  await expect.poll(() => page.textContent('h1')).toMatch('Hello Vite + React')
})
