import assert from 'node:assert'
import { createHash } from 'node:crypto'
import {
  normalizePath,
  type Plugin,
  type ResolvedConfig,
  type Rollup,
} from 'vite'

// https://github.com/vitejs/vite/blob/ea9aed7ebcb7f4be542bd2a384cbcb5a1e7b31bd/packages/vite/src/node/utils.ts#L1469-L1475
export function evalValue<T = any>(rawValue: string): T {
  const fn = new Function(`
    var console, exports, global, module, process, require
    return (\n${rawValue}\n)
  `)
  return fn()
}

// https://github.com/vitejs/vite/blob/946831f986cb797009b8178659d2b31f570c44ff/packages/vite/src/shared/utils.ts#L31-L34
const postfixRE = /[?#].*$/
export function cleanUrl(url: string): string {
  return url.replace(postfixRE, '')
}

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
