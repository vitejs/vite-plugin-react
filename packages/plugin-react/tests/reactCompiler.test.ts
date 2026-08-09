import path from 'node:path'
import { type Plugin, rolldown } from 'rolldown'
import { describe, expect, test } from 'vitest'
import pluginReact, { type Options } from '../src/index.ts'

describe('compiler option', () => {
  test('is disabled by default', () => {
    expect(pluginReact().map((plugin) => plugin.name)).not.toContain(
      'vite:react-compiler',
    )
  })

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

  test('allows source maps to be disabled', async () => {
    const compilerPlugin = pluginReact({
      compiler: { sourcemap: false },
    }).find((plugin) => plugin.name === 'vite:react-compiler')
    const transformHook = compilerPlugin?.transform
    if (!transformHook || typeof transformHook === 'function') {
      throw new Error('Expected an object transform hook')
    }

    const result = await transformHook.handler.call(
      {
        error(error: unknown) {
          throw error
        },
        warn() {},
      } as never,
      `export function App({ name }) { return <div>{name}</div> }`,
      '/entry.tsx',
    )

    expect(result).toMatchObject({ map: undefined })
  })
})

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
