import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { crawlFrameworkPackages } from './crawl-framework-packages'

describe(crawlFrameworkPackages, () => {
  let root: string

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'rsc-crawl-'))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  function writePackage(dir: string, pkgJson: Record<string, unknown>) {
    fs.mkdirSync(path.join(root, dir), { recursive: true })
    fs.writeFileSync(
      path.join(root, dir, 'package.json'),
      JSON.stringify({ version: '1.0.0', ...pkgJson }),
    )
  }

  // install a package into `node_modules` of `parent`
  function installPackage(
    parent: string,
    pkgJson: { name: string } & Record<string, unknown>,
  ) {
    writePackage(path.join(parent, 'node_modules', pkgJson.name), pkgJson)
  }

  // link a package outside `node_modules` into `node_modules` of `parent`, like a workspace package
  function linkPackage(parent: string, name: string, target: string) {
    const linkPath = path.join(root, parent, 'node_modules', name)
    fs.mkdirSync(path.dirname(linkPath), { recursive: true })
    fs.symlinkSync(
      path.relative(path.dirname(linkPath), path.join(root, target)),
      linkPath,
      'dir',
    )
  }

  function crawl() {
    return crawlFrameworkPackages(path.join(root, 'app'), {
      isBuild: false,
      isFrameworkPkgByJson(pkgJson) {
        const deps = pkgJson['peerDependencies']
        return deps && 'react' in deps
      },
    })
  }

  const reactLibrary = (name: string, extra?: Record<string, unknown>) => ({
    name,
    peerDependencies: { react: '*' },
    ...extra,
  })

  it('framework packages of the app', async () => {
    writePackage('app', { name: 'app', dependencies: { 'react-lib': '*' } })
    installPackage('app', reactLibrary('react-lib'))
    expect(await crawl()).toEqual(['react-lib'])
  })

  it('framework packages imported only by a linked package', async () => {
    writePackage('app', { name: 'app', dependencies: { ui: '*' } })
    writePackage('packages/ui', {
      name: 'ui',
      dependencies: { react: '*', 'react-lib': '*' },
    })
    linkPackage('app', 'ui', 'packages/ui')
    installPackage('packages/ui', reactLibrary('react-lib'))
    installPackage('packages/ui', { name: 'react' })
    expect(await crawl()).toEqual(['react-lib'])
  })

  it('linked packages of linked packages', async () => {
    writePackage('app', { name: 'app', dependencies: { ui: '*' } })
    writePackage('packages/ui', {
      name: 'ui',
      dependencies: { primitives: '*' },
    })
    writePackage('packages/primitives', {
      name: 'primitives',
      dependencies: { 'react-lib': '*' },
    })
    linkPackage('app', 'ui', 'packages/ui')
    linkPackage('packages/ui', 'primitives', 'packages/primitives')
    installPackage('packages/primitives', reactLibrary('react-lib'))
    expect(await crawl()).toEqual(['react-lib'])
  })

  it('devDependencies of linked packages', async () => {
    writePackage('app', { name: 'app', devDependencies: { ui: '*' } })
    writePackage('packages/ui', {
      name: 'ui',
      peerDependencies: { 'react-lib': '*' },
      devDependencies: { 'react-lib': '*' },
    })
    linkPackage('app', 'ui', 'packages/ui')
    installPackage('packages/ui', reactLibrary('react-lib'))
    expect(await crawl()).toEqual(['react-lib'])
  })

  it('dependencies of framework packages reached through a linked package', async () => {
    writePackage('app', { name: 'app', dependencies: { ui: '*' } })
    writePackage('packages/ui', {
      name: 'ui',
      dependencies: { 'react-lib': '*' },
    })
    linkPackage('app', 'ui', 'packages/ui')
    installPackage(
      'packages/ui',
      reactLibrary('react-lib', { dependencies: { 'react-lib-dep': '*' } }),
    )
    installPackage(
      'packages/ui/node_modules/react-lib',
      reactLibrary('react-lib-dep'),
    )
    expect((await crawl()).sort()).toEqual(['react-lib', 'react-lib-dep'])
  })

  it('skips non-framework packages installed in node_modules', async () => {
    // not linked, so vitefu's rule still applies: Vite pre-bundles it as a
    // whole, including the React libraries it imports
    writePackage('app', { name: 'app', dependencies: { 'non-react': '*' } })
    installPackage('app', {
      name: 'non-react',
      dependencies: { 'react-lib': '*' },
    })
    installPackage('app/node_modules/non-react', reactLibrary('react-lib'))
    expect(await crawl()).toEqual([])
  })

  it('handles linked packages that depend on each other', async () => {
    writePackage('app', { name: 'app', dependencies: { a: '*' } })
    writePackage('packages/a', { name: 'a', dependencies: { b: '*' } })
    writePackage('packages/b', {
      name: 'b',
      dependencies: { a: '*', app: '*', 'react-lib': '*' },
    })
    linkPackage('app', 'a', 'packages/a')
    linkPackage('packages/a', 'b', 'packages/b')
    linkPackage('packages/b', 'a', 'packages/a')
    linkPackage('packages/b', 'app', 'app')
    installPackage('packages/b', reactLibrary('react-lib'))
    expect(await crawl()).toEqual(['react-lib'])
  })
})
