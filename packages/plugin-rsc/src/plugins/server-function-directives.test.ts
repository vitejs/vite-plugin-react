import type { Rollup } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import {
  SERVER_FUNCTION_DIRECTIVE_MARKER,
  vitePluginServerFunctionDirectives,
  type ServerFunctionDirective,
} from './server-function-directives'

type EnvironmentName = 'rsc' | 'ssr' | 'client'

type Manager = Parameters<
  typeof vitePluginServerFunctionDirectives
>[0]['manager']

function createHarness(
  definitions: ServerFunctionDirective[],
  command: 'build' | 'serve' = 'build',
) {
  const manager: Manager = {
    config: { command },
    server: { environments: {} as Manager['server']['environments'] },
    toRelativeId: (id) => id,
    serverReferenceMetaMap: {},
  }
  const expandExportAll = vi.fn(async () => undefined)
  const plugin = vitePluginServerFunctionDirectives({
    definitions,
    manager,
    serverEnvironmentName: 'rsc',
    browserEnvironmentName: 'client',
    encryptionRuntime: '/encryption-runtime.js',
    rscRuntime: '/rsc-runtime.js',
    browserRuntime: '/browser-runtime.js',
    ssrRuntime: '/ssr-runtime.js',
    expandExportAll,
  })
  const transformHook = plugin.transform
  if (
    !transformHook ||
    typeof transformHook === 'function' ||
    !('handler' in transformHook)
  ) {
    throw new Error('expected an object transform hook')
  }
  const transform = transformHook.handler

  async function run(
    code: string,
    environment: EnvironmentName = 'rsc',
    id = '/src/example.ts',
  ) {
    const context = {
      environment: {
        name: environment,
        mode: command === 'build' ? 'build' : 'dev',
      },
    } as Rollup.TransformPluginContext
    const result = await transform.call(context, code, id, { moduleType: 'js' })
    if (!result) return
    if (typeof result === 'string') return { code: result, map: null }
    return {
      code:
        typeof result.code === 'string' ? result.code : result.code?.toString(),
      map: result.map,
    }
  }

  return { expandExportAll, manager, run }
}

function cacheDirective(
  overrides: Partial<ServerFunctionDirective> = {},
): ServerFunctionDirective {
  return {
    directive: /^use cache(?:: .+)?$/,
    test: (code) => code.includes('use cache'),
    rejectNonAsyncFunction: true,
    wrap: ({ value, directiveMatch, location }) =>
      `cache(${value}, ${JSON.stringify(directiveMatch[0])}, ${JSON.stringify(location)})`,
    ...overrides,
  }
}

describe('vitePluginServerFunctionDirectives', () => {
  it('hoists, wraps, and registers inline functions in RSC', async () => {
    const { manager, run } = createHarness([cacheDirective()])
    const result = await run(`
export async function getData() {
  "use cache";
  return 1;
}
`)
    expect(result?.code).toContain(SERVER_FUNCTION_DIRECTIVE_MARKER)
    expect(result?.code).toContain('cache($$hoist_')
    expect(result?.code).toContain('$$ReactServer.registerServerReference')
    expect(result?.code).toContain('/rsc-runtime.js')
    expect(
      manager.serverReferenceMetaMap['/src/example.ts']?.exportNames,
    ).toEqual([expect.stringMatching(/^\$\$hoist_/)])
  })

  it('encrypts captured values without adding ciphertext to the wrapper', async () => {
    const wrap = vi.fn(({ value }: { value: string }) => `cache(${value})`)
    const { run } = createHarness([cacheDirective({ wrap })])
    const result = await run(`
export async function outer(value) {
  return async function cached() {
    "use cache";
    return value;
  };
}
`)
    expect(result?.code).toContain('encryptActionBoundArgs([value])')
    expect(result?.code).toContain('decryptActionBoundArgs($$encoded)')
    expect(result?.code).toContain('/encryption-runtime.js')
    expect(wrap).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'inline', hasBoundArgs: true }),
    )
  })

  it('wraps module exports and records only selected references', async () => {
    const filterExport = vi.fn(
      ({ name }: { name: string }) => name !== 'metadata',
    )
    const { expandExportAll, manager, run } = createHarness([
      cacheDirective({ filterExport }),
    ])
    const result = await run(`
"use cache";
export async function getData() { return 1 }
export const metadata = { title: "test" };
`)
    expect(expandExportAll).toHaveBeenCalledOnce()
    expect(result?.code).toContain('cache(getData, "use cache", "module")')
    expect(result?.code).not.toContain('cache(metadata')
    expect(
      manager.serverReferenceMetaMap['/src/example.ts']?.exportNames,
    ).toEqual(['getData'])
    expect(filterExport).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'metadata', id: '/src/example.ts' }),
    )
  })

  it.each([
    ['client', '/browser-runtime.js'],
    ['ssr', '/ssr-runtime.js'],
  ] as const)('creates module proxies in %s', async (environment, runtime) => {
    const { run } = createHarness([cacheDirective()])
    const result = await run(
      `"use cache"; export async function getData() { return 1 }`,
      environment,
    )
    expect(result?.code).toContain(runtime)
    expect(result?.code).toContain('$$ReactClient.createServerReference')
    expect(result?.code).toContain('#getData')
  })

  it('uses clientError for non-RSC module boundaries', async () => {
    const { run } = createHarness([
      cacheDirective({
        clientError: ({ id, environment }) => `${environment}:${id}`,
      }),
    ])
    await expect(
      run(`"use cache"; export async function getData() {}`, 'client'),
    ).rejects.toThrow('client:/src/example.ts')
  })

  it('leaves non-server inline directives untouched', async () => {
    const { run } = createHarness([cacheDirective()])
    const code = `export async function getData() { "use cache" }`
    await expect(run(code, 'client')).resolves.toBeUndefined()
    await expect(run(code, 'ssr')).resolves.toBeUndefined()
  })

  it('wraps inline directives inside use-server modules without owning metadata', async () => {
    const { manager, run } = createHarness([cacheDirective()])
    manager.serverReferenceMetaMap['/src/example.ts'] = {
      importId: '/src/example.ts',
      referenceKey: 'existing',
      exportNames: ['action'],
    }
    const result = await run(`
"use server";
export async function action() {
  async function cached() { "use cache"; return 1 }
  return cached();
}
`)
    expect(result?.code).toContain('cache($$hoist_')
    expect(result?.code).not.toContain('$$ReactServer.registerServerReference')
    expect(manager.serverReferenceMetaMap['/src/example.ts']).toEqual({
      importId: '/src/example.ts',
      referenceKey: 'existing',
      exportNames: ['action'],
    })
  })

  it('rejects conflicting module-level custom and use-server directives', async () => {
    const { run } = createHarness([cacheDirective()])
    await expect(
      run(`"use cache"; "use server"; export async function action() {}`),
    ).rejects.toThrow('cannot contain both')
  })

  it('runs validation for inline and module directives', async () => {
    const validate = vi.fn()
    const { run } = createHarness([cacheDirective({ validate })])
    await run(`export async function getData() { "use cache: remote" }`)
    await run(`"use cache"; export async function getData() {}`)
    expect(validate).toHaveBeenCalledWith(
      expect.objectContaining({
        directive: 'use cache: remote',
        location: 'inline',
      }),
    )
    expect(validate).toHaveBeenCalledWith(
      expect.objectContaining({ directive: 'use cache', location: 'module' }),
    )
  })

  it('rejects synchronous functions when configured', async () => {
    const { run } = createHarness([cacheDirective()])
    await expect(
      run(`export function getData() { "use cache" }`),
    ).rejects.toThrow('non async function')
  })

  it('respects source and id prefilters and clears stale metadata', async () => {
    const test = vi.fn(() => false)
    const filter = vi.fn(() => false)
    const { manager, run } = createHarness([
      cacheDirective({ test }),
      cacheDirective({ test: undefined, filter }),
    ])
    manager.serverReferenceMetaMap['/src/example.ts'] = {
      importId: '/src/example.ts',
      referenceKey: 'stale',
      exportNames: ['stale'],
    }
    await expect(
      run(`export async function value() { "use cache" }`),
    ).resolves.toBeUndefined()
    expect(test).toHaveBeenCalled()
    expect(filter).toHaveBeenCalled()
    expect(manager.serverReferenceMetaMap['/src/example.ts']).toBeUndefined()
  })

  it('rejects overlapping module directive definitions', async () => {
    const { run } = createHarness([
      cacheDirective({ directive: /^use cache/ }),
      cacheDirective({ directive: 'use cache' }),
    ])
    await expect(
      run(`"use cache"; export async function getData() {}`, 'client'),
    ).rejects.toThrow('Multiple server function directives')
  })

  it('returns source maps for server and proxy transforms', async () => {
    const { run } = createHarness([cacheDirective()])
    const server = await run(`export async function getData() { "use cache" }`)
    const client = await run(
      `"use cache"; export async function getData() {}`,
      'client',
    )
    expect(server?.map).toMatchObject({ version: 3 })
    expect(client?.map).toMatchObject({ version: 3 })
  })
})
