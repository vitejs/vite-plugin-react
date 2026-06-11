import type { Rollup } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import {
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
    clientError: ({ id, environment }) =>
      `inline use cache is not allowed in ${environment}: ${id}`,
    wrap: ({ value, directiveMatch, location }) =>
      `cache(${value}, ${JSON.stringify(directiveMatch[0])}, ${JSON.stringify(location)})`,
    ...overrides,
  }
}

function parameterWrap(
  contexts: Array<{
    name: string
    location: string
    parameters: { count: number; hasRest: boolean } | undefined
  }>,
) {
  return cacheDirective({
    wrap: ({ value, name, location, parameters }) => {
      contexts.push({ name, location, parameters })
      return `cache(${value})`
    },
  })
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
    expect(result?.code).toMatchInlineSnapshot(`
      "/* __vite_rsc_server_function_directives__ */
      import * as $$ReactServer from "/rsc-runtime.js";

      export const getData = /* #__PURE__ */ $$ReactServer.registerServerReference(cache($$hoist_e9c2205b6101_0_getData, "use cache", "inline"), "53eb073e2100", "$$hoist_e9c2205b6101_0_getData");

      ;export async function $$hoist_e9c2205b6101_0_getData() {
        "use cache";
        return 1;
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_e9c2205b6101_0_getData, "name", { value: "getData" });
      "
    `)
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
    expect(result?.code).toMatchInlineSnapshot(`
      "/* __vite_rsc_server_function_directives__ */
      import * as $$ReactServer from "/rsc-runtime.js";
      import * as __vite_rsc_encryption_runtime from "/encryption-runtime.js";

      export async function outer(value) {
        return /* #__PURE__ */ $$ReactServer.registerServerReference((($$wrapped) => async ($$encoded, ...$$args) => $$wrapped(...await __vite_rsc_encryption_runtime.decryptActionBoundArgs($$encoded), ...$$args))(cache($$hoist_ab3ae7af371a_0_cached)), "53eb073e2100", "$$hoist_ab3ae7af371a_0_cached").bind(null, __vite_rsc_encryption_runtime.encryptActionBoundArgs([value]));
      }

      ;export async function $$hoist_ab3ae7af371a_0_cached(value) {
          "use cache";
          return value;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_ab3ae7af371a_0_cached, "name", { value: "cached" });
      "
    `)
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
    expect(result?.code).toMatchInlineSnapshot(`
      "/* __vite_rsc_server_function_directives__ */


      /* "use cache" */;
      async function getData() { return 1 }
      let metadata = { title: "test" };
      getData = /* #__PURE__ */ $$ReactServer.registerServerReference(cache(getData, "use cache", "module"), "53eb073e2100", "getData");
      export { getData };
      export { metadata };
      "
    `)
    expect(
      manager.serverReferenceMetaMap['/src/example.ts']?.exportNames,
    ).toEqual(['getData'])
    expect(filterExport).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'metadata', id: '/src/example.ts' }),
    )
  })

  it('creates module proxies in client', async () => {
    const { run } = createHarness([cacheDirective()])
    const result = await run(
      `"use cache"; export async function getData() { return 1 }`,
      'client',
    )
    expect(result?.code).toMatchInlineSnapshot(`
      "import * as $$ReactClient from "/browser-runtime.js";
       export const getData = /* #__PURE__ */ $$ReactClient.createServerReference("53eb073e2100#getData",$$ReactClient.callServer,undefined,undefined,"getData");
      "
    `)
  })

  it('creates module proxies in SSR', async () => {
    const { run } = createHarness([cacheDirective()])
    const result = await run(
      `"use cache"; export async function getData() { return 1 }`,
      'ssr',
    )
    expect(result?.code).toMatchInlineSnapshot(`
      "import * as $$ReactClient from "/ssr-runtime.js";
       export const getData = /* #__PURE__ */ $$ReactClient.createServerReference("53eb073e2100#getData",$$ReactClient.callServer,undefined,undefined,"getData");
      "
    `)
  })

  it('uses clientError for non-RSC inline directives', async () => {
    const { run } = createHarness([
      cacheDirective({
        clientError: ({ id, environment }) => `${environment}:${id}`,
      }),
    ])
    await expect(
      run(`export async function getData() { "use cache" }`, 'client'),
    ).rejects.toThrow('client:/src/example.ts')
  })

  it.each(['client', 'ssr'] as const)(
    'rejects inline directives in %s when clientError is configured',
    async (environment) => {
      const { run } = createHarness([cacheDirective()])
      const code = `export async function getData() { "use cache" }`
      await expect(run(code, environment)).rejects.toThrow(
        `inline use cache is not allowed in ${environment}: /src/example.ts`,
      )
    },
  )

  it('leaves non-server inline directives untouched without clientError', async () => {
    const { run } = createHarness([cacheDirective()])
    const { run: runWithoutError } = createHarness([
      cacheDirective({ clientError: undefined }),
    ])
    const code = `export async function getData() { "use cache" }`
    await expect(run(code, 'client')).rejects.toThrow()
    await expect(runWithoutError(code, 'client')).resolves.toBeUndefined()
    await expect(runWithoutError(code, 'ssr')).resolves.toBeUndefined()
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
    expect(result?.code).toMatchInlineSnapshot(`
      "/* __vite_rsc_server_function_directives__ */


      "use server";
      export async function action() {
        const cached = /* #__PURE__ */ cache($$hoist_bf311121ee97_0_cached, "use cache", "inline");
        return cached();
      }

      ;export async function $$hoist_bf311121ee97_0_cached() { "use cache"; return 1 };
      /* #__PURE__ */ Object.defineProperty($$hoist_bf311121ee97_0_cached, "name", { value: "cached" });
      "
    `)
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

  it.each(['this', 'super', 'arguments'] as const)(
    'rejects %s inside inline directive functions',
    async (expression) => {
      const { run } = createHarness([cacheDirective()])
      const code =
        expression === 'super'
          ? `class Base { value() {} } class Test extends Base { static async value() { "use cache"; return super.value() } }`
          : `export async function getData() { "use cache"; return ${expression} }`
      await expect(run(code)).rejects.toThrow(
        `"use cache" functions cannot use ${JSON.stringify(expression)}`,
      )
    },
  )

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

  it('exposes declared parameter metadata for inline functions', async () => {
    const contexts: Parameters<typeof parameterWrap>[0] = []
    const { run } = createHarness([parameterWrap(contexts)])
    await run(`
export async function getData(value, { offset }, ...rest) {
  "use cache";
  return [value, offset, rest];
}
`)
    expect(contexts).toEqual([
      expect.objectContaining({
        location: 'inline',
        parameters: { count: 3, hasRest: true },
      }),
    ])

    contexts.length = 0
    await run(`
export async function action() {
  "use cache";
  return 1;
}
`)
    expect(contexts).toEqual([
      expect.objectContaining({
        parameters: { count: 0, hasRest: false },
      }),
    ])
  })

  it('exposes declared parameter metadata for module exports', async () => {
    const contexts: Parameters<typeof parameterWrap>[0] = []
    const { run } = createHarness([parameterWrap(contexts)])
    await run(`
"use cache";
export async function direct(value, offset) { return value + offset }
const local = async (value) => value;
export { local };
export { external } from "./external";
`)
    expect(contexts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'direct',
          parameters: { count: 2, hasRest: false },
        }),
        expect.objectContaining({
          name: 'local',
          parameters: { count: 1, hasRest: false },
        }),
        expect.objectContaining({ name: 'external', parameters: undefined }),
      ]),
    )
  })

  it('exposes declared parameter metadata for default exports', async () => {
    const contexts: Parameters<typeof parameterWrap>[0] = []
    const { run } = createHarness([parameterWrap(contexts)])
    await run(`
"use cache";
export default async function Page({ params }, ...rest) {
  return [params, rest];
}
`)
    expect(contexts).toEqual([
      expect.objectContaining({
        name: 'default',
        parameters: { count: 2, hasRest: true },
      }),
    ])

    contexts.length = 0
    await run(`
"use cache";
const Page = async ({ params }) => params;
export default Page;
`)
    expect(contexts).toEqual([
      expect.objectContaining({
        name: 'default',
        parameters: { count: 1, hasRest: false },
      }),
    ])

    contexts.length = 0
    await run(`
"use cache";
export default createPage();
`)
    expect(contexts).toEqual([
      expect.objectContaining({
        name: 'default',
        parameters: undefined,
      }),
    ])
  })
})
