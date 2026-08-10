import path from 'node:path'
import { type Plugin, rolldown } from 'rolldown'
import { describe, expect, test } from 'vitest'
import pluginReact, {
  type Options,
  type ReactCompilerOptions,
} from '../src/index.ts'

describe('compiler option', () => {
  test('compiles React components', async () => {
    const output = await bundle(
      { compiler: true },
      `
        export function App({ name }: { name: string }) {
          return <div>{name}</div>
        }
      `,
    )

    expect(output.code).toContain('react/compiler-runtime')
    expect(output.code).toMatch(/\bc\(2\)/)
    expect(
      output.map?.sources.some((source) => source.endsWith('entry.tsx')),
    ).toBe(true)
  })

  test('forwards compiler options', async () => {
    const code = `
      export function App({ name }) {
        return <div>{name}</div>
      }
    `
    const unannotated = await bundle(
      { compiler: { compilationMode: 'annotation' } },
      code,
    )
    const annotated = await bundle(
      { compiler: { compilationMode: 'annotation' } },
      `
        export function App({ name }) {
          'use memo'
          return <div>{name}</div>
        }
      `,
    )
    const react18 = await bundle({ compiler: { target: '18' } }, code)

    expect(unannotated.code).not.toContain('react/compiler-runtime')
    expect(annotated.code).toContain('react/compiler-runtime')
    expect(react18.code).toContain('react-compiler-runtime')
  })

  test('uses the React plugin filters', async () => {
    const output = await bundle(
      { compiler: true, exclude: /entry\.tsx$/ },
      `export function App({ name }) { return <div>{name}</div> }`,
    )

    expect(output.code).not.toContain('react/compiler-runtime')
  })

  test('uses the Vite build sourcemap setting by default', async () => {
    expect((await transformWithBuildConfig({}, false)).map).toBeFalsy()
    expect((await transformWithBuildConfig({}, true)).map).toBeTruthy()
    expect(
      (await transformWithBuildConfig({ sourcemap: false }, true)).map,
    ).toBeFalsy()
    expect(
      (await transformWithBuildConfig({ sourcemap: true }, false)).map,
    ).toBeTruthy()
  })
})

async function transformWithBuildConfig(
  compiler: ReactCompilerOptions,
  buildSourcemap: boolean,
) {
  const plugin = pluginReact({ compiler }).find(
    (plugin) => plugin.name === 'vite:react-compiler',
  )!
  const context = {
    error(message: unknown): never {
      throw new Error(String(message))
    },
    warn() {},
  }

  if (typeof plugin.config !== 'function')
    throw new Error('Missing config hook')
  await plugin.config.call(
    context as any,
    {},
    { command: 'build', mode: 'production' },
  )

  if (typeof plugin.configResolved !== 'function') {
    throw new Error('Missing configResolved hook')
  }
  await plugin.configResolved.call(
    context as any,
    {
      command: 'build',
      build: { sourcemap: buildSourcemap },
    } as any,
  )

  if (typeof plugin.transform !== 'object') {
    throw new Error('Missing transform hook')
  }
  return plugin.transform.handler.call(
    context as any,
    `export function App({ name }) { return <div>{name}</div> }`,
    '/entry.tsx',
  )
}

async function bundle(options: Options, code: string) {
  const entry = '/entry.tsx'
  const build = await rolldown({
    input: entry,
    plugins: [virtualFilePlugin(entry, code), pluginReact(options)],
    external: [/^react(\/|$)/, /^react-compiler-runtime$/],
  })
  const { output } = await build.generate({ format: 'esm', sourcemap: true })
  return output[0]
}

function virtualFilePlugin(entry: string, code: string): Plugin {
  return {
    name: 'virtual-file',
    resolveId(id, importer) {
      const baseDir = importer ? path.posix.dirname(importer) : '/'
      if (path.posix.resolve(baseDir, id) === entry) return entry
    },
    load(id) {
      if (id === entry) return code
    },
  }
}
