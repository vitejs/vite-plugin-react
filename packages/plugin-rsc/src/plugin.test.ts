import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { resolveConfig } from 'vite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import rsc from './plugin'

describe('framework package crawl', () => {
  let base: string

  beforeEach(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-rsc-crawl-'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    fs.rmSync(base, { recursive: true, force: true })
  })

  function writeJson(file: string, data: unknown) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(data))
  }

  function writeProject(dir: string, dependencies: Record<string, string>) {
    writeJson(path.join(dir, 'package.json'), {
      name: path.basename(dir),
      private: true,
      dependencies,
    })
    for (const name of Object.keys(dependencies)) {
      writeJson(path.join(dir, 'node_modules', name, 'package.json'), {
        name,
        version: '1.0.0',
        peerDependencies: { react: '*' },
      })
    }
  }

  async function resolveSsrNoExternal(cwd: string, root: string) {
    vi.spyOn(process, 'cwd').mockReturnValue(cwd)
    const config = await resolveConfig(
      { root, configFile: false, logLevel: 'silent', plugins: [rsc()] },
      'serve',
    )
    return config.environments.ssr!.resolve.noExternal
  }

  it('includes react packages listed in the root package.json', async () => {
    const cwd = path.join(base, 'runner')
    const root = path.join(base, 'app')
    writeProject(cwd, {})
    writeProject(root, { 'root-react-lib': '1.0.0' })

    expect(await resolveSsrNoExternal(cwd, root)).toContain('root-react-lib')
  })

  it('includes react packages listed in the cwd package.json', async () => {
    const cwd = base
    const root = path.join(base, 'app')
    writeProject(cwd, { 'cwd-react-lib': '1.0.0' })
    writeProject(root, {})

    expect(await resolveSsrNoExternal(cwd, root)).toContain('cwd-react-lib')
  })
})
