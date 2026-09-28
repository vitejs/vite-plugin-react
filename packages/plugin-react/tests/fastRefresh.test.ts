import { type ResolvedConfig, resolveConfig } from 'vite'
import { describe, expect, test } from 'vitest'
import pluginReact, { type Options } from '../src/index.ts'

describe('fastRefresh option', () => {
  test('disables the refresh transform', async () => {
    expect((await resolveServeConfig({})).oxc).toMatchObject({
      jsx: { refresh: true },
    })
    expect(
      (await resolveServeConfig({ fastRefresh: false })).oxc,
    ).toMatchObject({ jsx: { refresh: false } })
  })

  test('disables the refresh wrapper and the preamble', async () => {
    const enabled = await resolveServeConfig({})
    const disabled = await resolveServeConfig({ fastRefresh: false })

    expect(await appliesRefreshWrapper(enabled)).toBe(true)
    expect(await appliesRefreshWrapper(disabled)).toBe(false)
    expect(getPreambleTags(enabled)).toHaveLength(1)
    expect(getPreambleTags(disabled)).toBeUndefined()
  })

  test('leaves Fast Refresh out of the compiler transform', async () => {
    const enabled = await transformWithCompiler({})
    expect(enabled).toContain('$RefreshReg$')
    expect(enabled).toContain('$RefreshSig$')

    const disabled = await transformWithCompiler({ fastRefresh: false })
    expect(disabled).not.toContain('$RefreshReg$')
    expect(disabled).not.toContain('$RefreshSig$')
    expect(disabled).toContain('react/compiler-runtime')
    expect(disabled).toContain('react/jsx-dev-runtime')
  })
})

async function resolveServeConfig(options: Options) {
  return resolveConfig(
    {
      configFile: false,
      logLevel: 'silent',
      plugins: [pluginReact(options)],
    },
    'serve',
    'development',
    'development',
  )
}

function getPlugin(config: ResolvedConfig, name: string) {
  const plugin = config.plugins.find((plugin) => plugin.name === name)
  if (!plugin) throw new Error(`Missing plugin ${name}`)
  return plugin
}

async function appliesRefreshWrapper(config: ResolvedConfig) {
  const plugin = getPlugin(config, 'vite:react:refresh-wrapper')
  if (typeof plugin.applyToEnvironment !== 'function') {
    throw new Error('Missing applyToEnvironment hook')
  }
  const result = await plugin.applyToEnvironment.call(plugin, {
    config: { consumer: 'client' },
  } as any)
  return Boolean(result)
}

function getPreambleTags(config: ResolvedConfig) {
  const plugin = getPlugin(config, 'vite:react-refresh')
  if (typeof plugin.transformIndexHtml !== 'function') {
    throw new Error('Missing transformIndexHtml hook')
  }
  return plugin.transformIndexHtml.call({} as any, '', {} as any) as
    | unknown[]
    | undefined
}

async function transformWithCompiler(options: Options) {
  const config = await resolveServeConfig({ compiler: true, ...options })
  const plugin = getPlugin(config, 'vite:react-compiler')
  if (typeof plugin.transform !== 'object') {
    throw new Error('Missing transform hook')
  }
  const context = {
    error(message: unknown): never {
      throw new Error(String(message))
    },
    warn() {},
    environment: { config: { consumer: 'client', command: 'serve' } },
  }
  const result = (await plugin.transform.handler.call(
    context as any,
    `
      import { useState } from 'react'

      export function App({ name }: { name: string }) {
        const [count] = useState(0)
        return <div>{name} {count}</div>
      }
    `,
    '/entry.tsx',
  )) as { code: string }
  return result.code
}
