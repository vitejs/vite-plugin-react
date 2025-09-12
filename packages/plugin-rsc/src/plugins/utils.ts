import assert from 'node:assert'
import { createHash } from 'node:crypto'
import {
  normalizePath,
  type Plugin,
  type ResolvedConfig,
  type Rollup,
} from 'vite'

export function sortObject<T extends object>(o: T) {
  return Object.fromEntries(
    Object.entries(o).sort(([a], [b]) => a.localeCompare(b)),
  ) as T
}

// Rethrow transform error through `this.error` with `error.pos`
export function withRollupError<F extends (...args: any[]) => any>(
  ctx: Rollup.TransformPluginContext,
  f: F,
): F {
  function processError(e: any): never {
    if (e && typeof e === 'object' && typeof e.pos === 'number') {
      return ctx.error(e, e.pos)
    }
    throw e
  }
  return function (this: any, ...args: any[]) {
    try {
      const result = f.apply(this, args)
      if (result instanceof Promise) {
        return result.catch((e: any) => processError(e))
      }
      return result
    } catch (e: any) {
      processError(e)
    }
  } as F
}

export function createVirtualPlugin(
  name: string,
  load: Plugin['load'],
): Plugin {
  name = 'virtual:' + name
  return {
    name: `rsc:virtual-${name}`,
    resolveId(source, _importer, _options) {
      return source === name ? '\0' + name : undefined
    },
    load(id, options) {
      if (id === '\0' + name) {
        return (load as Function).apply(this, [id, options])
      }
    },
  }
}

export function normalizeRelativePath(s: string): string {
  s = normalizePath(s)
  return s[0] === '.' ? s : './' + s
}

export function getEntrySource(
  config: Pick<ResolvedConfig, 'build'>,
  name: string = 'index',
): string {
  const input = config.build.rollupOptions.input
  assert(
    typeof input === 'object' &&
      !Array.isArray(input) &&
      name in input &&
      typeof input[name] === 'string',
    `[vite-rsc:getEntrySource] expected 'build.rollupOptions.input' to be an object with a '${name}' property that is a string, but got ${JSON.stringify(input)}`,
  )
  return input[name]
}

export function hashString(v: string): string {
  return createHash('sha256').update(v).digest().toString('hex').slice(0, 12)
}

// normalize server entry exports to align with server runtimes
// https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/
// https://srvx.h3.dev/guide
// https://vercel.com/docs/functions/functions-api-reference?framework=other#fetch-web-standard
// https://github.com/jacob-ebey/rsbuild-rsc-playground/blob/eb1a54afa49cbc5ff93c315744d7754d5ed63498/plugin/fetch-server.ts#L59-L79
export function getFetchHandlerExport(exports: object): any {
  if ('default' in exports) {
    const default_ = exports.default
    if (
      default_ &&
      typeof default_ === 'object' &&
      'fetch' in default_ &&
      typeof default_.fetch === 'function'
    ) {
      return default_.fetch
    }
    if (typeof default_ === 'function') {
      return default_
    }
  }
  throw new Error('Invalid server handler entry')
}
