import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deriveBareSpecifier } from './derive-bare-specifier'

describe(deriveBareSpecifier, () => {
  let tmpRoot: string

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'derive-bare-spec-'))
  })

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  })

  function makePackage(name: string, manifest: object, files: Record<string, string>): string {
    const dir = path.join(tmpRoot, 'node_modules', name)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name, ...manifest }, null, 2),
    )
    for (const [rel, content] of Object.entries(files)) {
      const filePath = path.join(dir, rel)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, content)
    }
    return dir
  }

  it('returns null for files outside any package', () => {
    expect(deriveBareSpecifier(path.join(tmpRoot, 'random.js'))).toBe(null)
  })

  it('handles wildcard subpath exports', () => {
    const dir = makePackage(
      'vinext',
      { exports: { './shims/*': './dist/shims/*.js' } },
      { 'dist/shims/foo.js': '' },
    )
    expect(deriveBareSpecifier(path.join(dir, 'dist/shims/foo.js'))).toBe(
      'vinext/shims/foo',
    )
  })

  it('handles literal subpath exports', () => {
    const dir = makePackage(
      'pkg',
      { exports: { './cache': './dist/cache.js' } },
      { 'dist/cache.js': '' },
    )
    expect(deriveBareSpecifier(path.join(dir, 'dist/cache.js'))).toBe(
      'pkg/cache',
    )
  })

  it('handles main entry "."', () => {
    const dir = makePackage(
      'pkg',
      { exports: { '.': './dist/index.js' } },
      { 'dist/index.js': '' },
    )
    expect(deriveBareSpecifier(path.join(dir, 'dist/index.js'))).toBe('pkg')
  })

  it('handles conditional exports (prefers import)', () => {
    const dir = makePackage(
      'pkg',
      {
        exports: {
          './shims/*': {
            import: './dist/shims/*.js',
            require: './dist/shims/*.cjs',
          },
        },
      },
      { 'dist/shims/foo.js': '', 'dist/shims/foo.cjs': '' },
    )
    expect(deriveBareSpecifier(path.join(dir, 'dist/shims/foo.js'))).toBe(
      'pkg/shims/foo',
    )
  })

  it('handles string-shorthand exports', () => {
    const dir = makePackage(
      'pkg',
      { exports: './dist/index.js' },
      { 'dist/index.js': '' },
    )
    expect(deriveBareSpecifier(path.join(dir, 'dist/index.js'))).toBe('pkg')
  })

  it('handles top-level conditional shorthand (no subpath keys)', () => {
    const dir = makePackage(
      'pkg',
      { exports: { import: './dist/index.js', require: './dist/index.cjs' } },
      { 'dist/index.js': '', 'dist/index.cjs': '' },
    )
    expect(deriveBareSpecifier(path.join(dir, 'dist/index.js'))).toBe('pkg')
  })

  it('returns null when exports field hides the file', () => {
    const dir = makePackage(
      'pkg',
      { exports: { './public': './dist/public.js' } },
      { 'dist/public.js': '', 'dist/private.js': '' },
    )
    expect(deriveBareSpecifier(path.join(dir, 'dist/private.js'))).toBe(null)
  })

  it('falls back to relative path when no exports field is set', () => {
    const dir = makePackage(
      'pkg',
      { main: 'index.js' },
      { 'lib/foo.js': '' },
    )
    expect(deriveBareSpecifier(path.join(dir, 'lib/foo.js'))).toBe(
      'pkg/lib/foo.js',
    )
  })

  it('returns null for packages without a name', () => {
    const dir = path.join(tmpRoot, 'node_modules', 'nameless')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'package.json'), '{}')
    fs.writeFileSync(path.join(dir, 'foo.js'), '')
    expect(deriveBareSpecifier(path.join(dir, 'foo.js'))).toBe(null)
  })

  it('prefers more specific subpath when multiple match', () => {
    const dir = makePackage(
      'pkg',
      {
        exports: {
          './*': './dist/*',
          './shims/*': './dist/shims/*.js',
        },
      },
      { 'dist/shims/foo.js': '' },
    )
    // The literal-with-suffix (./shims/*) is more specific than the
    // catch-all (./*).
    expect(deriveBareSpecifier(path.join(dir, 'dist/shims/foo.js'))).toBe(
      'pkg/shims/foo',
    )
  })
})
