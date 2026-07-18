import type { Rollup } from 'vite'
import { describe, expect, it } from 'vitest'
import { vitePluginUseServer } from './plugin'

// The server-reference metadata map is shared by every environment's
// transforms. These tests pin down its cleanup ownership semantics:
//
// - The rsc environment registers inline "use server" actions. Modules
//   containing them may also flow through ssr/client graphs (e.g. a framework
//   reading route metadata during SSR). The inline-action-replay example covers
//   this path. Those passes must not clear the entries, in dev or build, or a
//   persisted payload fails with "server reference not found".
// - Cleanup of a removed directive still happens: the rsc environment may
//   always delete, and a non-rsc environment may delete entries it registered
//   itself (file-level "use server" proxies).

const INLINE_ACTION_MODULE = `
export function LikeButton() {
  async function like() {
    'use server'
    return 1
  }
  return like
}
`
const NO_DIRECTIVE_MODULE = `export const title = 'hello'\n`

const MODULE_ID = '/src/like-button.tsx'
// The reference key the rsc environment assigns at render time; this is the
// key the replay path looks up in the generated manifest.
const ACTION_KEY = 'a1b2c3d4'
// The rsc transform hoists an inline action to a generated export name; mirror
// that shape so the fixture matches real transform output.
const EXPORT_NAME = '$$hoist_0_anonymous_server_function'

type Manager = Parameters<typeof vitePluginUseServer>[1]
type EnvironmentName = 'rsc' | 'ssr' | 'client'

function setup(command: 'build' | 'serve') {
  const manager = {
    config: { command },
    serverReferenceMetaMap: {},
  } as unknown as Manager
  const plugins = vitePluginUseServer({}, manager)

  const getHandler = (name: string, hook: 'transform' | 'load') => {
    const h = plugins.find((p) => p.name === name)?.[hook]
    if (!h || typeof h === 'function' || !('handler' in h)) {
      throw new Error(`expected an object ${hook} hook on ${name}`)
    }
    return h.handler as (...args: any[]) => any
  }
  const transform = getHandler('rsc:use-server', 'transform')
  const loadManifest = getHandler(
    'rsc:virtual-vite-rsc/server-references',
    'load',
  )
  const mode = command === 'build' ? 'build' : 'dev'

  // Register the entry the way an environment's transform does. Seeded rather
  // than produced by the rsc transform because that path calls resolvePackage
  // (require.resolve of the built runtime), which would couple this test to a
  // prior dist build. The deletes and the manifest generator below are the
  // real plugin internals.
  function seed(environmentName: EnvironmentName) {
    manager.serverReferenceMetaMap[MODULE_ID] = {
      importId: MODULE_ID,
      referenceKey: ACTION_KEY,
      exportNames: [EXPORT_NAME],
      environmentName,
    }
  }

  async function runPass(environment: EnvironmentName, code: string) {
    const ctx = {
      environment: { name: environment, mode },
    } as Rollup.TransformPluginContext
    await transform.call(ctx, code, MODULE_ID, { moduleType: 'js' })
  }

  // Generate the server-references manifest the replay path resolves against.
  async function manifestCode() {
    const ctx = { environment: { mode } }
    const result = await loadManifest.call(
      ctx,
      '\0virtual:vite-rsc/server-references',
      undefined,
    )
    return typeof result === 'string' ? result : result.code
  }

  return { manager, seed, runPass, manifestCode }
}

describe('rsc:use-server metadata cleanup ownership', () => {
  it('build: non-rsc passes preserve an rsc-registered inline action in the manifest', async () => {
    const { seed, runPass, manifestCode } = setup('build')
    seed('rsc')
    await runPass('ssr', INLINE_ACTION_MODULE)
    await runPass('client', INLINE_ACTION_MODULE)

    // Replay looks up serverReferences[ACTION_KEY]; the key (and its importer)
    // must be present, or the action throws "server reference not found".
    const code = await manifestCode()
    expect(code).toContain(`"${ACTION_KEY}":`)
    expect(code).toContain(MODULE_ID)
    expect(code).toContain(EXPORT_NAME)
  })

  it('dev: non-rsc passes preserve an rsc-registered inline action', async () => {
    const { manager, seed, runPass } = setup('serve')
    seed('rsc')
    await runPass('ssr', INLINE_ACTION_MODULE)
    await runPass('client', INLINE_ACTION_MODULE)
    expect(manager.serverReferenceMetaMap[MODULE_ID]).toBeDefined()
  })

  it('the rsc pass cleans up a removed directive', async () => {
    const { manager, seed, runPass } = setup('serve')
    seed('rsc')
    await runPass('rsc', NO_DIRECTIVE_MODULE)
    expect(manager.serverReferenceMetaMap[MODULE_ID]).toBeUndefined()
  })

  it('a non-rsc pass cleans up only its own registration', async () => {
    const { manager, seed, runPass } = setup('serve')
    seed('ssr')
    await runPass('client', NO_DIRECTIVE_MODULE)
    expect(manager.serverReferenceMetaMap[MODULE_ID]).toBeDefined()
    await runPass('ssr', NO_DIRECTIVE_MODULE)
    expect(manager.serverReferenceMetaMap[MODULE_ID]).toBeUndefined()
  })
})
