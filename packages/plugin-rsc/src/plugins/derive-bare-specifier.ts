/**
 * Derive a package's own bare specifier for an absolute filesystem path
 * resolved into `node_modules/`.
 *
 * Used to populate the `packageSources` map when a `'use client'` module is
 * reached via a non-bare-specifier import (e.g. a relative path between two
 * files of the same package). Without this, the only way to get into the
 * working `client-package-proxy` branch is to have observed the file via a
 * bare-specifier import — which fails for packages that import their own
 * internal client modules via relative paths.
 *
 * Returns the bare specifier (e.g. `"vinext/shims/foo"`) if the file is
 * exposed by the package's `exports` field, or `null` otherwise. Callers
 * should round-trip the result through `this.resolve()` to confirm it
 * resolves back to the same id before relying on it.
 */
import fs from 'node:fs'
import path from 'node:path'
import { normalizePath } from 'vite'

const SERVER_CONDITION_PRIORITY = ['import', 'module', 'default', 'node']

/**
 * Walk up from `absolutePath` looking for the closest enclosing `package.json`.
 * Returns the directory containing it, or `null`.
 */
function findClosestPackageRoot(absolutePath: string): string | null {
  let dir = path.dirname(absolutePath)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * Walk a (possibly nested) conditional-exports value and return the first
 * string target reachable via server-relevant conditions. Falls back to the
 * first string target if no preferred condition matches.
 */
function pickConditionTarget(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const entry of value) {
      const r = pickConditionTarget(entry)
      if (r !== null) return r
    }
    return null
  }
  if (value === null || typeof value !== 'object') return null
  const obj = value as Record<string, unknown>
  for (const cond of SERVER_CONDITION_PRIORITY) {
    if (cond in obj) {
      const r = pickConditionTarget(obj[cond])
      if (r !== null) return r
    }
  }
  // Fall back to any condition that yields a string target.
  for (const v of Object.values(obj)) {
    const r = pickConditionTarget(v)
    if (r !== null) return r
  }
  return null
}

/**
 * Specificity for sorting subpath keys: literal keys outrank patterns; among
 * patterns, longer prefixes win.
 */
function subpathSpecificity(key: string): number {
  const star = key.indexOf('*')
  if (star === -1) return key.length + 100_000
  return star
}

/**
 * Reverse-map `fileRelative` (e.g. `"./dist/shims/foo.js"`) to the subpath
 * exposed by the `exports` field (e.g. `"./shims/foo"`). Returns `null` if no
 * subpath exposes this file.
 */
function reverseExports(
  exports: unknown,
  fileRelative: string,
): string | null {
  // Sugar: `"exports": "./foo.js"` is shorthand for `{ ".": "./foo.js" }`.
  if (typeof exports === 'string') {
    return exports === fileRelative ? '.' : null
  }
  // Conditional-only at top level (no subpath keys) is also shorthand for `.`.
  if (
    exports !== null &&
    typeof exports === 'object' &&
    !Array.isArray(exports) &&
    !Object.keys(exports).some((k) => k === '.' || k.startsWith('./'))
  ) {
    const target = pickConditionTarget(exports)
    return target === fileRelative ? '.' : null
  }
  if (exports === null || typeof exports !== 'object' || Array.isArray(exports)) {
    return null
  }

  const entries = Object.entries(exports as Record<string, unknown>)
  entries.sort(([a], [b]) => subpathSpecificity(b) - subpathSpecificity(a))

  for (const [key, value] of entries) {
    const target = pickConditionTarget(value)
    if (target === null) continue

    const keyStar = key.indexOf('*')
    const targetStar = target.indexOf('*')
    if ((keyStar === -1) !== (targetStar === -1)) continue

    if (keyStar === -1) {
      if (target === fileRelative) return key
    } else {
      const targetPrefix = target.slice(0, targetStar)
      const targetSuffix = target.slice(targetStar + 1)
      if (
        fileRelative.startsWith(targetPrefix) &&
        fileRelative.endsWith(targetSuffix) &&
        fileRelative.length >= targetPrefix.length + targetSuffix.length
      ) {
        const wildcard = fileRelative.slice(
          targetPrefix.length,
          fileRelative.length - targetSuffix.length,
        )
        if (wildcard.length === 0) continue
        return key.slice(0, keyStar) + wildcard + key.slice(keyStar + 1)
      }
    }
  }
  return null
}

/**
 * Try to derive the bare specifier (e.g. `"vinext/shims/foo"`) under which
 * `absolutePath` is exposed. Returns `null` if the file isn't reachable via a
 * bare specifier (no enclosing package, package.json has no `name`, exports
 * field hides this subpath, etc).
 */
export function deriveBareSpecifier(absolutePath: string): string | null {
  const pkgRoot = findClosestPackageRoot(absolutePath)
  if (!pkgRoot) return null
  let pkg: { name?: unknown; exports?: unknown }
  try {
    pkg = JSON.parse(
      fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf-8'),
    )
  } catch {
    return null
  }
  if (typeof pkg.name !== 'string' || pkg.name.length === 0) return null

  const fileRelative =
    './' + normalizePath(path.relative(pkgRoot, absolutePath))

  // No exports field: any deep import works (Node's pre-exports behavior).
  if (pkg.exports === undefined) {
    return pkg.name + fileRelative.slice(1)
  }

  const subpath = reverseExports(pkg.exports, fileRelative)
  if (subpath === null) return null
  return pkg.name + (subpath === '.' ? '' : subpath.slice(1))
}
