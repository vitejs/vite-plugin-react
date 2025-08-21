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
  let stdout = ''
  let stderr = ''
  child.stdout!.on('data', (data) => {
    stdout += stripVTControlCharacters(String(data))
    if (process.env.TEST_DEBUG) {
      console.log(styleText('cyan', label), data.toString())
    }
  })
  child.stderr!.on('data', (data) => {
    stderr += stripVTControlCharacters(String(data))
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

  return {
    proc: child,
    done,
    findPort,
    kill,
    stdout: () => stdout,
    stderr: () => stderr,
  }
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
  let proc!: ReturnType<typeof runCli>

  // TODO: `beforeAll` is called again on any test failure.
  // https://playwright.dev/docs/test-retries
  test.beforeAll(async () => {
    if (options.mode === 'dev') {
      proc = runCli({
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
      proc = runCli({
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
      resave(): void {
        fs.writeFileSync(filepath, current)
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
    proc: () => proc,
  }
}

export async function setupIsolatedFixture(options: {
  src: string
  dest: string
}) {
  // copy fixture
  fs.rmSync(options.dest, { recursive: true, force: true })
  fs.cpSync(options.src, options.dest, {
    recursive: true,
    filter: (src) => !src.includes('node_modules'),
  })

  // extract workspace overrides
  const rootDir = path.join(import.meta.dirname, '..', '..', '..')
  const workspaceYaml = fs.readFileSync(
    path.join(rootDir, 'pnpm-workspace.yaml'),
    'utf-8',
  )
  const overridesMatch = workspaceYaml.match(
    /overrides:\s*([\s\S]*?)(?=\n\w|\n*$)/,
  )
  const overridesSection = overridesMatch ? overridesMatch[0] : 'overrides:'
  const tempWorkspaceYaml = `\
${overridesSection}
  '@vitejs/plugin-rsc': ${JSON.stringify('file:' + path.join(rootDir, 'packages/plugin-rsc'))}
  '@vitejs/plugin-react': ${JSON.stringify('file:' + path.join(rootDir, 'packages/plugin-react'))}
`
  fs.writeFileSync(
    path.join(options.dest, 'pnpm-workspace.yaml'),
    tempWorkspaceYaml,
  )

  // install
  await x('pnpm', ['i'], {
    throwOnError: true,
    nodeOptions: {
      cwd: options.dest,
      stdio: [
        'ignore',
        process.env.TEST_DEBUG ? 'inherit' : 'ignore',
        'inherit',
      ],
    },
  })
}

// inspired by
//   https://github.com/remix-run/react-router/blob/433872f6ab098eaf946cc6c9cf80abf137420ad2/integration/helpers/vite.ts#L239
// for syntax highlighting of /* js */, use this extension
//   https://github.com/mjbvz/vscode-comment-tagged-templates
export async function setupInlineFixture(options: {
  src: string
  dest: string
  files?: Record<
    string,
    string | { cp: string } | { edit: (s: string) => string }
  >
}) {
  fs.rmSync(options.dest, { recursive: true, force: true })
  fs.mkdirSync(options.dest, { recursive: true })

  // copy src
  fs.cpSync(options.src, options.dest, {
    recursive: true,
    filter: (src) => !src.includes('node_modules') && !src.includes('dist'),
  })

  // write additional files
  if (options.files) {
    for (let [filename, contents] of Object.entries(options.files)) {
      const destFile = path.join(options.dest, filename)
      fs.mkdirSync(path.dirname(destFile), { recursive: true })

      // custom command
      if (typeof contents === 'object' && 'cp' in contents) {
        const srcFile = path.join(options.dest, contents.cp)
        fs.copyFileSync(srcFile, destFile)
        continue
      }
      if (typeof contents === 'object' && 'edit' in contents) {
        const editted = contents.edit(fs.readFileSync(destFile, 'utf-8'))
        fs.writeFileSync(destFile, editted)
        continue
      }

      // write a new file
      contents = contents.replace(/^\n*/, '').replace(/\s*$/, '\n')
      const indent = contents.match(/^\s*/)?.[0] ?? ''
      const strippedContents = contents
        .split('\n')
        .map((line) => line.replace(new RegExp(`^${indent}`), ''))
        .join('\n')
      fs.writeFileSync(destFile, strippedContents)
    }
  }
}
