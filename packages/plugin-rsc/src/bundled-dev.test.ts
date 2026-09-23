import fs from 'node:fs/promises'
import { createServer as createHttpServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import type { DevEnvironment, HotPayload, ViteDevServer } from 'vite'
import { describe, expect, test, vi } from 'vitest'
import {
  createBundledDevResourceMiddleware,
  crawlBundledDevServerGraph,
  getBundledDevBootstrapUrl,
  hasBundledDevBoundaryChange,
  installBundledDevRscUpdateBarrier,
  renderBundledDevBootstrap,
  renderBundledDevClientReferences,
  resolveBundledDevSourceFile,
} from './bundled-dev'

describe('bundled development', () => {
  type HotSendArgs = [payload: HotPayload] | [event: string, payload?: unknown]

  test('crawls from request URLs and records resolved module ids', async () => {
    const clientModule = {
      id: '/repo/src/Client.tsx',
      url: '/src/Client.tsx',
      importedModules: new Set(),
    }
    const entryModule = {
      id: '/repo/src/entry.rsc.tsx',
      url: './src/entry.rsc.tsx',
      importedModules: new Set([clientModule]),
    }
    const modules = new Map([
      [entryModule.url, entryModule],
      [clientModule.url, clientModule],
    ])
    const transformRequest = vi.fn(async (url: string) => ({
      code: '',
      map: null,
      deps: url === entryModule.url ? [clientModule.url] : [],
      dynamicDeps: [],
    }))
    const environment = {
      getTopLevelConfig: () => ({
        assetsInclude: () => false,
        publicDir: false,
      }),
      moduleGraph: {
        getModuleById: (id: string) =>
          [...modules.values()].find((module) => module.id === id),
        getModuleByUrl: (url: string) => Promise.resolve(modules.get(url)),
      },
      pluginContainer: {
        resolveId: (source: string) =>
          Promise.resolve(
            [...modules.values()].find((module) => module.url === source),
          ),
      },
      transformRequest,
    } as unknown as DevEnvironment

    const graph = await crawlBundledDevServerGraph(environment, [
      entryModule.url,
    ])

    expect(transformRequest).toHaveBeenCalledWith(entryModule.url)
    expect(graph.moduleIds).toEqual(new Set([entryModule.id, clientModule.id]))
  })

  test('renders a closed client-reference map that ignores HMR timestamps', () => {
    const code = renderBundledDevClientReferences({
      '/repo/src/Counter.tsx': {
        importId: '/repo/src/Counter.tsx',
        referenceKey: '/src/Counter.tsx',
      },
      '\0virtual:remove-css': {
        importId: '\0virtual:remove-css',
        referenceKey: '/@id/__x00__virtual:remove-css',
      },
    })

    expect(code).toContain('import * as __vite_rsc_client_reference_0')
    expect(code).toContain('virtual:vite-rsc/resolved-id/')
    expect(code).toContain("part.startsWith('t=')")
    expect(code).toContain('new Proxy(references')
  })

  test('renders the HMR runtime before the browser bundle', () => {
    expect(renderBundledDevBootstrap('/base/', '/base/assets/index.js')).toBe(
      'await import("/base/bundledDevClient.mjs");\n' +
        'await import("/base/assets/index.js");',
    )
    expect(getBundledDevBootstrapUrl('/base/')).toBe(
      '/base/@id/__x00__virtual:vite-rsc/bundled-dev-bootstrap',
    )
  })

  test('detects changes to the client-boundary graph', () => {
    const references = {
      '/repo/src/A.tsx?t=123': {
        importId: '/repo/src/A.tsx',
        referenceKey: '/src/A.tsx',
      },
      '/repo/src/B.tsx': {
        importId: '/repo/src/B.tsx',
        referenceKey: '/src/B.tsx',
      },
    }

    expect(
      hasBundledDevBoundaryChange(
        ['/repo/src/A.tsx', '/repo/src/B.tsx'],
        references,
      ),
    ).toBe(false)
    expect(hasBundledDevBoundaryChange(['/repo/src/A.tsx'], references)).toBe(
      true,
    )
  })

  test('resolves source assets without allowing traversal', () => {
    expect(resolveBundledDevSourceFile('/src/icon.svg', '/repo/app')).toBe(
      path.resolve('/repo/app/src/icon.svg'),
    )
    expect(
      resolveBundledDevSourceFile('/@fs/repo/shared/icon.svg', '/repo/app'),
    ).toBe(path.resolve('/repo/shared/icon.svg'))
    expect(
      resolveBundledDevSourceFile('/%00secret.svg', '/repo/app'),
    ).toBeUndefined()
    expect(
      resolveBundledDevSourceFile('/..%2Fsecret.svg', '/repo/app'),
    ).toBeUndefined()
  })

  test('serves the bootstrap and source resources under a base path', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vite-rsc-bundled-'))
    await fs.writeFile(path.join(root, 'icon.svg'), '<svg/>')
    const transformedUrls: string[] = []
    const middleware = createBundledDevResourceMiddleware(
      {
        config: {
          root,
          base: '/base/',
          assetsInclude: (file: string) => file.endsWith('.svg'),
          server: { fs: { strict: false }, headers: {} },
        },
      } as unknown as Pick<ViteDevServer, 'config'>,
      {
        async transformRequest(url: string) {
          transformedUrls.push(url)
          return url.startsWith('/style.css')
            ? { code: '.fixture { color: red; }', map: null, etag: 'style' }
            : null
        },
      },
      () => '/base/assets/index.js',
    )
    const server = createHttpServer((req, res) => {
      middleware(req, res, (error) => {
        res.statusCode = error ? 500 : 404
        res.end(error instanceof Error ? error.message : undefined)
      })
    })

    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', resolve)
      })
      const address = server.address()
      expect(address && typeof address === 'object').toBe(true)
      const origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`

      const bootstrap = await fetch(
        `${origin}/base/@id/__x00__virtual:vite-rsc/bundled-dev-bootstrap`,
      )
      const bootstrapCode = await bootstrap.text()
      expect(bootstrapCode).toContain(
        'await import("/base/bundledDevClient.mjs");',
      )
      expect(bootstrapCode).toContain('await import("/base/assets/index.js");')
      expect(bootstrapCode.indexOf('bundledDevClient.mjs')).toBeLessThan(
        bootstrapCode.indexOf('assets/index.js'),
      )

      const css = await fetch(`${origin}/base/style.css`, {
        headers: { Accept: 'text/css,*/*;q=0.1' },
      })
      expect(css.headers.get('content-type')).toContain('text/css')
      expect(await css.text()).toContain('color: red')
      expect(transformedUrls).toContain('/style.css?direct')

      const asset = await fetch(`${origin}/base/icon.svg`)
      expect(asset.headers.get('content-type')).toContain('image/svg+xml')
      expect(await asset.text()).toBe('<svg/>')
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  test('waits for the browser bundle before forwarding an RSC update', async () => {
    const sent: unknown[] = []
    let finishBuild!: () => void
    const buildReady = new Promise<void>((resolve) => {
      finishBuild = resolve
    })
    const hot = {
      send(...args: HotSendArgs) {
        sent.push(args[0])
      },
    }
    const barrier = installBundledDevRscUpdateBarrier({
      hot,
      waitForLatestClientBuild: () => buildReady,
      onError(error) {
        throw error
      },
    })

    hot.send({
      type: 'custom',
      event: 'rsc:update',
      data: { file: '/src/Page.tsx' },
    })
    await Promise.resolve()
    expect(sent).toEqual([])

    finishBuild()
    await barrier.waitForIdle()
    expect(sent).toEqual([
      {
        type: 'custom',
        event: 'rsc:update',
        data: { file: '/src/Page.tsx' },
      },
    ])
    barrier.dispose()
  })

  test('retries a deferred RSC update after the browser bundle recovers', async () => {
    const sent: unknown[] = []
    const warnings: unknown[] = []
    let buildFails = true
    const hot = {
      send(...args: HotSendArgs) {
        sent.push(args[0])
      },
    }
    const barrier = installBundledDevRscUpdateBarrier({
      hot,
      async waitForLatestClientBuild() {
        if (buildFails) throw new Error('browser build failed')
      },
      onError(error) {
        warnings.push(error)
      },
    })

    hot.send({ type: 'custom', event: 'rsc:update' })
    await barrier.waitForIdle()
    expect(sent).toEqual([])
    expect(warnings).toHaveLength(1)

    buildFails = false
    hot.send({
      type: 'bundled-dev-update',
      changedIds: [],
      url: '/hmr_patch_1.js',
      seq: 1,
    })
    await barrier.waitForIdle()
    expect(sent).toEqual([
      {
        type: 'bundled-dev-update',
        changedIds: [],
        url: '/hmr_patch_1.js',
        seq: 1,
      },
      { type: 'custom', event: 'rsc:update' },
    ])
    barrier.dispose()
  })
})
