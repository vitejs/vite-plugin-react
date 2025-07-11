import assert from 'node:assert'
import { type SpawnOptions, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { stripVTControlCharacters, styleText } from 'node:util'
import test from '@playwright/test'
import { x } from 'tinyexec'

function runCli(options: { command: string; label?: string } & SpawnOptions) {
  const [name, ...args] = options.command.split(' ')
  const child = x(name!, args, { nodeOptions: options }).process!
  const label = `[${options.label ?? 'cli'}]`
  child.stdout!.on('data', (data) => {
    if (process.env.TEST_DEBUG) {
      console.log(styleText('cyan', label), data.toString())
    }
  })
  child.stderr!.on('data', (data) => {
    console.log(styleText('magenta', label), data.toString())
  })
  const done = new Promise<void>((resolve) => {
    child.on('exit', (code) => {
      if (code !== 0 && code !== 143 && process.platform !== 'win32') {
        console.log(styleText('magenta', `${label}`), `exit code ${code}`)
      }
      resolve()
    })
  })

  async function findPort(): Promise<number> {
    let stdout = ''
    return new Promise((resolve) => {
      child.stdout!.on('data', (data) => {
        stdout += stripVTControlCharacters(String(data))
        const match = stdout.match(/http:\/\/localhost:(\d+)/)
        if (match) {
          resolve(Number(match[1]))
        }
      })
    })
  }

  function kill() {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'])
    } else {
      child.kill()
    }
  }

  return { proc: child, done, findPort, kill }
}

export type Fixture = ReturnType<typeof useFixture>

export function useFixture(options: {
  root: string
  mode?: 'dev' | 'build'
  command?: string
  buildCommand?: string
  cliOptions?: SpawnOptions
}) {
  let cleanup: (() => Promise<void>) | undefined
  let baseURL!: string

  const cwd = path.resolve(options.root)

  // TODO: `beforeAll` is called again on any test failure.
  // https://playwright.dev/docs/test-retries
  test.beforeAll(async () => {
    if (options.mode === 'dev') {
      const proc = runCli({
        command: options.command ?? `pnpm dev`,
        label: `${options.root}:dev`,
        cwd,
        ...options.cliOptions,
      })
      const port = await proc.findPort()
      // TODO: use `test.extend` to set `baseURL`?
      baseURL = `http://localhost:${port}`
      cleanup = async () => {
        proc.kill()
        await proc.done
      }
    }
    if (options.mode === 'build') {
      if (!process.env.TEST_SKIP_BUILD) {
        const proc = runCli({
          command: options.buildCommand ?? `pnpm build`,
          label: `${options.root}:build`,
          cwd,
          ...options.cliOptions,
        })
        await proc.done
        assert(proc.proc.exitCode === 0)
      }
      const proc = runCli({
        command: options.command ?? `pnpm preview`,
        label: `${options.root}:preview`,
        cwd,
        ...options.cliOptions,
      })
      const port = await proc.findPort()
      baseURL = `http://localhost:${port}`
      cleanup = async () => {
        proc.kill()
        await proc.done
      }
    }
  })

  test.afterAll(async () => {
    await cleanup?.()
  })

  const originalFiles: Record<string, string> = {}

  function createEditor(filepath: string) {
    filepath = path.resolve(cwd, filepath)
    const init = fs.readFileSync(filepath, 'utf-8')
    originalFiles[filepath] ??= init
    let current = init
    return {
      edit(editFn: (data: string) => string): void {
        const next = editFn(current)
        assert(next !== current, 'Edit function did not change the content')
        current = next
        fs.writeFileSync(filepath, next)
      },
      reset(): void {
        fs.writeFileSync(filepath, originalFiles[filepath]!)
      },
    }
  }

  test.afterAll(async () => {
    for (const [filepath, content] of Object.entries(originalFiles)) {
      fs.writeFileSync(filepath, content)
    }
  })

  return {
    mode: options.mode,
    root: cwd,
    url: (url: string = './') => new URL(url, baseURL).href,
    createEditor,
  }
}

export async function setupIsolatedFixture(options: {
  src: string
  dest: string
}) {
  // copy fixture
  fs.rmSync(options.dest, { recursive: true, force: true })
  fs.cpSync(options.src, options.dest, { recursive: true })
  fs.rmSync(path.join(options.dest, 'node_modules'), {
    recursive: true,
    force: true,
  })

  // setup package.json overrides
  const packagesDir = path.join(import.meta.dirname, '..', '..')
  const overrides = {
    '@vitejs/plugin-rsc': `file:${path.join(packagesDir, 'plugin-rsc')}`,
  }
  editFileJson(path.join(options.dest, 'package.json'), (pkg: any) => {
    Object.assign(((pkg.pnpm ??= {}).overrides ??= {}), overrides)
    return pkg
  })

  // install
  console.log('[setupIsolatedFixture] before pnpm')
  // await x('pnpm', ['i'], {
  //   throwOnError: true,
  //   nodeOptions: {
  //     cwd: options.dest,
  //     stdio: [
  //       'ignore',
  //       // process.env.TEST_DEBUG ? 'inherit' : 'ignore',
  //       'inherit',
  //       'inherit',
  //     ],
  //   },
  // })
  console.log('[setupIsolatedFixture] after pnpm')
}

function editFileJson(filepath: string, edit: (s: string) => string) {
  fs.writeFileSync(
    filepath,
    JSON.stringify(
      edit(JSON.parse(fs.readFileSync(filepath, 'utf-8'))),
      null,
      2,
    ),
  )
}
