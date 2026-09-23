import fs from 'node:fs'
import path from 'node:path'
import { lookup } from 'mrmime'
import {
  type Connect,
  type DevEnvironment,
  type HotPayload,
  isCSSRequest,
  isFileLoadingAllowed,
  normalizePath,
  send,
  type ViteDevServer,
} from 'vite'
import { withResolvedIdProxy } from './plugins/resolved-id-proxy'
import { parseIdQuery } from './plugins/shared'
import { cleanUrl } from './plugins/vite-utils'

const BUNDLED_DEV_BOOTSTRAP_PATH =
  '/@id/__x00__virtual:vite-rsc/bundled-dev-bootstrap'
const BUNDLED_DEV_CLIENT_FILE = 'bundledDevClient.mjs'

export type BundledDevServerGraph = {
  moduleIds: Set<string>
  hasCss: boolean
}

type ClientReference = {
  importId: string
  referenceKey: string
}

type HotSendArgs = [payload: HotPayload] | [event: string, payload?: unknown]

type HotChannel = {
  send(...args: HotSendArgs): void | Promise<void>
}

type BundledDevController = {
  waitForLatestBuildOutput?: () => Promise<void>
}

export async function crawlBundledDevServerGraph(
  environment: DevEnvironment,
  sources: string[],
): Promise<BundledDevServerGraph> {
  const moduleIds = new Set<string>()
  let hasCss = false
  const config = environment.getTopLevelConfig()

  async function crawl(source: string): Promise<void> {
    const resolved = await environment.pluginContainer.resolveId(source)
    if (!resolved || resolved.external || moduleIds.has(resolved.id)) return
    moduleIds.add(resolved.id)
    if (resolved.id.includes('virtual:vite-rsc/assets-manifest')) return

    const { filename, query } = parseIdQuery(resolved.id)
    let file = fs.existsSync(filename) ? filename : undefined
    if (!file && filename.startsWith('/') && config.publicDir) {
      const publicFile = path.join(config.publicDir, filename.slice(1))
      if (fs.existsSync(publicFile)) file = publicFile
    }
    const isCss = isCSSRequest(resolved.id)
    const isCssLink =
      isCss && !('raw' in query) && !('inline' in query) && !('url' in query)
    const isResource =
      isCss ||
      config.assetsInclude(filename) ||
      'raw' in query ||
      'inline' in query ||
      'url' in query
    if (file && isResource) {
      hasCss ||= isCssLink
      return
    }

    const requestUrl =
      environment.moduleGraph.getModuleById(resolved.id)?.url ?? source
    const result = await environment.transformRequest(requestUrl)
    const module =
      (await environment.moduleGraph.getModuleByUrl(requestUrl)) ??
      environment.moduleGraph.getModuleById(resolved.id)
    if (!module) return

    for (const imported of module.importedModules) {
      await crawl(imported.url)
    }
    for (const imported of [
      ...(result?.deps ?? []),
      ...(result?.dynamicDeps ?? []),
    ]) {
      await crawl(imported)
    }
  }

  for (const source of sources) {
    await crawl(source)
  }
  return { moduleIds, hasCss }
}

export function filterBundledDevClientReferences<T extends ClientReference>(
  references: Record<string, T>,
  moduleIds: Set<string>,
): Record<string, T> {
  const reachableIds = new Set(
    [...moduleIds].map((id) => normalizePath(cleanUrl(id))),
  )
  return Object.fromEntries(
    Object.entries(references).filter(([id]) =>
      reachableIds.has(normalizePath(cleanUrl(id))),
    ),
  )
}

export function getBundledDevBoundaryIds(
  references: Record<string, ClientReference>,
): string[] {
  return Object.keys(references).map(normalizeBoundaryId).sort()
}

export function renderBundledDevClientReferences(
  references: Record<string, ClientReference>,
): string {
  const entries: string[] = []
  let imports = ''
  for (const [index, meta] of Object.values(references)
    .sort((a, b) => a.referenceKey.localeCompare(b.referenceKey))
    .entries()) {
    const name = `__vite_rsc_client_reference_${index}`
    imports += `import * as ${name} from ${JSON.stringify(withResolvedIdProxy(meta.importId))};\n`
    entries.push(
      `${JSON.stringify(meta.referenceKey)}: () => Promise.resolve(${name})`,
    )
  }
  return `${imports}
const references = {${entries.join(',\n')}};

function withoutHmrTimestamp(id) {
  const hashIndex = id.indexOf('#');
  const hash = hashIndex === -1 ? '' : id.slice(hashIndex);
  const beforeHash = hashIndex === -1 ? id : id.slice(0, hashIndex);
  const queryIndex = beforeHash.indexOf('?');
  if (queryIndex === -1) return id;
  const pathname = beforeHash.slice(0, queryIndex);
  const query = beforeHash
    .slice(queryIndex + 1)
    .split('&')
    .filter(part => part && !part.startsWith('t='));
  return pathname + (query.length ? '?' + query.join('&') : '') + hash;
}

export default new Proxy(references, {
  get(target, key, receiver) {
    if (typeof key !== 'string') return Reflect.get(target, key, receiver);
    return target[key] ?? target[withoutHmrTimestamp(key)];
  },
});
`
}

export function renderBundledDevBootstrap(
  base: string,
  clientEntryUrl: string,
): string {
  return [
    `await import(${JSON.stringify(withBase(base, BUNDLED_DEV_CLIENT_FILE))});`,
    `await import(${JSON.stringify(clientEntryUrl)});`,
  ].join('\n')
}

export function getBundledDevBootstrapUrl(base: string): string {
  return withBase(base, BUNDLED_DEV_BOOTSTRAP_PATH.slice(1))
}

export function getBundledDevClientUrl(base: string): string {
  return withBase(base, BUNDLED_DEV_CLIENT_FILE)
}

export function getBundledDevSourceUrl(file: string, root: string): string {
  const normalizedFile = normalizePath(file)
  const normalizedRoot = withTrailingSlash(normalizePath(root))
  if (normalizedFile.startsWith(normalizedRoot)) {
    return `/${normalizedFile.slice(normalizedRoot.length)}`
  }
  return path.posix.join('/@fs/', normalizedFile)
}

/**
 * RSC and SSR stay as source environments when the browser is bundled. Serve
 * the source CSS and assets referenced by their responses before an app's
 * catch-all request handler runs.
 */
export function createBundledDevResourceMiddleware(
  server: Pick<ViteDevServer, 'config'>,
  clientEnvironment: Pick<DevEnvironment, 'transformRequest'>,
  getClientEntryUrl: () => string | undefined,
): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (!req.url || (req.method !== 'GET' && req.method !== 'HEAD')) {
      next()
      return
    }

    const requestUrl = normalizeRequestUrl(req.url, server.config.base)
    if (!requestUrl) {
      next()
      return
    }

    if (cleanUrl(requestUrl) === BUNDLED_DEV_BOOTSTRAP_PATH) {
      const clientEntryUrl = getClientEntryUrl()
      if (!clientEntryUrl) {
        next(new Error('[vite-rsc] bundled client entry is not ready'))
        return
      }
      send(
        req,
        res,
        renderBundledDevBootstrap(server.config.base, clientEntryUrl),
        'js',
        { headers: server.config.server.headers },
      )
      return
    }

    if (isCSSRequest(requestUrl)) {
      const wantsCss =
        req.headers.accept?.includes('text/css') ||
        req.headers['sec-fetch-dest'] === 'style'
      const transformUrl = wantsCss ? withDirectQuery(requestUrl) : requestUrl

      try {
        const result = await clientEnvironment.transformRequest(transformUrl)
        if (!result) {
          next()
          return
        }
        appendVaryHeader(res, 'Accept', 'Sec-Fetch-Dest')
        send(req, res, result.code, wantsCss ? 'css' : 'js', {
          etag: result.etag,
          headers: server.config.server.headers,
          map: result.map,
        })
      } catch (error) {
        if (hasErrorCode(error, 'ERR_LOAD_URL')) {
          next()
        } else if (hasErrorCode(error, 'ERR_DENIED_ID')) {
          respondForbidden(req, res)
        } else {
          next(error)
        }
      }
      return
    }

    const file = resolveBundledDevSourceFile(requestUrl, server.config.root)
    if (!file || !server.config.assetsInclude(cleanUrl(file))) {
      next()
      return
    }

    try {
      const realFile = normalizePath(await fs.promises.realpath(file))
      if (!isFileLoadingAllowed(server.config, realFile)) {
        respondForbidden(req, res)
        return
      }

      const content = await fs.promises.readFile(realFile)
      send(
        req,
        res,
        content,
        lookup(cleanUrl(file)) ?? 'application/octet-stream',
        { headers: server.config.server.headers },
      )
    } catch (error) {
      if (hasErrorCode(error, 'ENOENT') || hasErrorCode(error, 'ENOTDIR')) {
        next()
      } else {
        next(error)
      }
    }
  }
}

export function installBundledDevRscUpdateBarrier(options: {
  hot: HotChannel
  onError(error: unknown): void
  waitForLatestClientBuild(): Promise<void>
}): { dispose(): void; waitForIdle(): Promise<void> } {
  const originalSend = options.hot.send
  let disposed = false
  let flushPromise: Promise<void> | undefined
  let pendingArgs: HotSendArgs | undefined
  let deferredArgs: HotSendArgs | undefined

  const forward = (args: HotSendArgs) =>
    Reflect.apply(originalSend, options.hot, args) as void | Promise<void>

  const flush = async () => {
    while (!disposed && pendingArgs) {
      const args = pendingArgs
      pendingArgs = undefined
      try {
        await options.waitForLatestClientBuild()
      } catch (error) {
        deferredArgs = pendingArgs ?? args
        options.onError(error)
        continue
      }
      deferredArgs = undefined
      if (!pendingArgs) await forward(args)
    }
  }

  const schedule = () => {
    if (flushPromise || disposed) return
    flushPromise = Promise.resolve()
      .then(flush)
      .finally(() => {
        flushPromise = undefined
        if (pendingArgs && !disposed) schedule()
      })
  }

  const wrappedSend = (...args: HotSendArgs) => {
    const payload = args[0]
    const isRscUpdate =
      typeof payload === 'string'
        ? payload === 'rsc:update'
        : payload.type === 'custom' && payload.event === 'rsc:update'
    if (!isRscUpdate) {
      const result = forward(args)
      if (
        typeof payload !== 'string' &&
        payload.type === 'bundled-dev-update' &&
        deferredArgs &&
        !pendingArgs
      ) {
        pendingArgs = deferredArgs
        deferredArgs = undefined
        schedule()
      }
      return result
    }

    pendingArgs = args
    schedule()
  }
  options.hot.send = wrappedSend

  return {
    dispose() {
      disposed = true
      pendingArgs = undefined
      deferredArgs = undefined
      if (options.hot.send === wrappedSend) options.hot.send = originalSend
    },
    waitForIdle() {
      return flushPromise ?? Promise.resolve()
    },
  }
}

export function getBundledDevController(
  environment: DevEnvironment,
): BundledDevController | undefined {
  return (environment as DevEnvironment & { bundledDev?: BundledDevController })
    .bundledDev
}

export function hasBundledDevBoundaryChange(
  initialIds: readonly string[],
  references: Record<string, ClientReference>,
): boolean {
  const initial = new Set(initialIds.map(normalizeBoundaryId))
  const current = getBundledDevBoundaryIds(references)
  return (
    initial.size !== current.length || current.some((id) => !initial.has(id))
  )
}

function normalizeRequestUrl(
  requestUrl: string,
  base: string,
): string | undefined {
  let parsed: URL
  try {
    parsed = new URL(requestUrl, 'http://vite-rsc.local')
    decodeURI(parsed.pathname)
  } catch {
    return
  }

  let basePath = base
  try {
    if (/^https?:\/\//.test(base)) basePath = new URL(base).pathname
  } catch {
    return
  }
  if (!basePath.startsWith('/')) basePath = '/'
  basePath = withTrailingSlash(basePath)

  let pathname = parsed.pathname
  if (basePath !== '/') {
    if (!pathname.startsWith(basePath)) return
    pathname = `/${pathname.slice(basePath.length)}`
  }
  return `${pathname}${parsed.search}`
}

export function resolveBundledDevSourceFile(
  requestUrl: string,
  root: string,
): string | undefined {
  let pathname: string
  try {
    pathname = decodeURIComponent(
      new URL(requestUrl, 'http://vite-rsc.local').pathname,
    )
  } catch {
    return
  }
  if (pathname.includes('\0')) return

  if (pathname.startsWith('/@fs/')) {
    return path.resolve(path.parse(root).root, pathname.slice('/@fs/'.length))
  }
  if (!pathname.startsWith('/')) return

  const file = path.resolve(root, `.${pathname}`)
  const relative = path.relative(root, file)
  if (relative.startsWith('..') || path.isAbsolute(relative)) return
  return file
}

function withBase(base: string, file: string): string {
  return `${withTrailingSlash(base)}${file.replace(/^\/+/, '')}`
}

function withDirectQuery(url: string): string {
  if (/[?&]direct(?:[=&]|$)/.test(url)) return url
  return `${url}${url.includes('?') ? '&' : '?'}direct`
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code
}

function respondForbidden(
  req: Connect.IncomingMessage,
  res: Parameters<Connect.NextHandleFunction>[1],
): void {
  res.statusCode = 403
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(req.method === 'HEAD' ? undefined : 'Forbidden')
}

function appendVaryHeader(
  res: Parameters<Connect.NextHandleFunction>[1],
  ...values: string[]
): void {
  const current = res.getHeader('Vary')
  const entries = new Set(
    (Array.isArray(current) ? current : current ? [String(current)] : [])
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean),
  )
  values.forEach((value) => entries.add(value))
  res.setHeader('Vary', [...entries].join(', '))
}

function normalizeBoundaryId(id: string): string {
  return normalizePath(cleanUrl(id))
}

function withTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}
