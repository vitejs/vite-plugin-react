import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// https://github.com/vitejs/vite/blob/ea9aed7ebcb7f4be542bd2a384cbcb5a1e7b31bd/packages/vite/src/node/utils.ts#L1469-L1475
export function evalValue<T = any>(rawValue: string): T {
  const fn = new Function(`
    var console, exports, global, module, process, require
    return (\n${rawValue}\n)
  `)
  return fn()
}

// https://github.com/vitejs/vite-plugin-vue/blob/06931b1ea2b9299267374cb8eb4db27c0626774a/packages/plugin-vue/src/utils/query.ts#L13
export function parseIdQuery(id: string): {
  filename: string
  query: {
    [k: string]: string
  }
} {
  if (!id.includes('?')) return { filename: id, query: {} }
  const [filename, rawQuery] = id.split(`?`, 2) as [string, string]
  const query = Object.fromEntries(new URLSearchParams(rawQuery))
  return { filename, query }
}

// https://github.com/vitejs/vite/blob/946831f986cb797009b8178659d2b31f570c44ff/packages/vite/src/shared/utils.ts#L31-L34
const postfixRE = /[?#].*$/
export function cleanUrl(url: string): string {
  return url.replace(postfixRE, '')
}

const require = createRequire(import.meta.url)

export function resolvePackage(name: string): string {
  return pathToFileURL(require.resolve(name)).href
}
