import type { Plugin } from 'vite'
import { describe, expect, test } from 'vitest'
import react, { reactCompiler } from './index'

type TransformHook = Extract<Plugin['transform'], { handler: unknown }>
type TransformHandler = TransformHook['handler']

function getTransform(plugin: Plugin) {
  const transform = plugin.transform as TransformHook
  const run = (code: string, id: string, consumer: 'client' | 'server') =>
    (transform.handler as TransformHandler).call(
      {
        environment: { config: { consumer } },
        error(message: string) {
          throw new Error(message)
        },
        warn() {},
      } as unknown as ThisParameterType<TransformHandler>,
      code,
      id,
    )
  return { transform, run }
}

const component = `
import { useState } from 'react'

export function App({ title }: { title: string }) {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{title}: {count}</button>
}
`

describe('reactCompiler', () => {
  test('compiles components and preserves JSX', async () => {
    const { run } = getTransform(reactCompiler())
    const result = await run(component, '/src/App.tsx', 'client')
    expect(result).toBeTruthy()
    const code = (result as { code: string }).code
    expect(code).toContain('react/compiler-runtime')
    expect(code).toMatch(/_c\(\d+\)/)
    // JSX is left for the JSX transform of the rest of the pipeline
    expect(code).toContain('<button')
    // TypeScript is removed alongside
    expect(code).not.toContain('title: string')
  })

  test('is a pre plugin with a code filter and client-only environments', () => {
    const plugin = reactCompiler()
    const { transform } = getTransform(plugin)
    expect(plugin.enforce).toBe('pre')
    expect(transform.filter?.code).toBeDefined()
    const applyToEnvironment = plugin.applyToEnvironment as (env: {
      config: { consumer: string }
    }) => boolean
    expect(applyToEnvironment({ config: { consumer: 'client' } })).toBe(true)
    expect(applyToEnvironment({ config: { consumer: 'server' } })).toBe(false)
  })

  test('skips modules that cannot contain components or hooks', async () => {
    const { run } = getTransform(reactCompiler())
    expect(
      await run('export const answer = 42', '/src/answer.ts', 'client'),
    ).toBeUndefined()
  })

  test('skips server environments', async () => {
    const { run } = getTransform(reactCompiler())
    expect(await run(component, '/src/App.tsx', 'server')).toBeUndefined()
  })

  test('honors annotation mode', async () => {
    const { run } = getTransform(
      reactCompiler({ compilationMode: 'annotation' }),
    )
    expect(await run(component, '/src/App.tsx', 'client')).toBeUndefined()
    const annotated = component.replace(
      'const [count',
      '"use memo"\n  const [count',
    )
    const result = await run(annotated, '/src/App.tsx', 'client')
    expect((result as { code: string }).code).toMatch(/_c\(\d+\)/)
  })

  test('uses react-compiler-runtime for older targets', async () => {
    const { run } = getTransform(reactCompiler({ target: '18' }))
    const result = await run(component, '/src/App.tsx', 'client')
    expect((result as { code: string }).code).toContain(
      'react-compiler-runtime',
    )
  })
})

describe('react({ compiler: true })', () => {
  const plugin = react({ compiler: true }).find(
    (p) => p.name === 'vite:react-compiler',
  )!

  test('compiles components and transforms JSX', async () => {
    const { run } = getTransform(plugin)
    const code = (await run(component, '/src/App.tsx', 'client')) as {
      code: string
    }
    expect(code.code).toMatch(/_c\(\d+\)/)
    expect(code.code).toContain('react/jsx-runtime')
    expect(code.code).not.toContain('<button')
  })

  test('still transforms JSX in files the compiler skips', async () => {
    const { run } = getTransform(plugin)
    const code = (await run(
      'export const el = <div />',
      '/src/el.tsx',
      'server',
    )) as { code: string }
    expect(code.code).toContain('react/jsx-runtime')
    expect(code.code).not.toContain('compiler-runtime')
  })

  test('is not environment-gated', () => {
    expect(plugin.applyToEnvironment).toBeUndefined()
  })
})
