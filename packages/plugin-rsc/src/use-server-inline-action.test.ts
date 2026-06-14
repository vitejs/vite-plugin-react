import type { Rollup } from 'vite'
import { describe, expect, it } from 'vitest'
import { vitePluginUseServer } from './plugin'

// End-to-end shape of the bug: render -> cache -> revive.
//
// 1. RENDER: the rsc environment transforms a module with an inline "use server"
//    action (no file-level directive) and registers it in serverReferenceMetaMap.
// 2. The non-rsc (ssr/client) build passes re-run over the same shared map. They
//    exist to clean up a removed file-level directive during dev HMR, but in a
//    build they were deleting the inline action's entry.
// 3. The server-references manifest is generated from that map. When the rendered
//    output is cached/prerendered and later REVIVED without re-executing the
//    module body, the action is resolved only through this manifest -- and if the
//    entry was deleted, its id is gone.
// 4. REVIVE: the runtime looks up `serverReferences[id]` (src/rsc.tsx); a missing
//    id throws "server reference not found".
//
// The fix scopes the non-rsc delete to dev, so the build manifest keeps the id.

const INLINE_ACTION_MODULE = `
export function LikeButton() {
  async function like() {
    'use server'
    return 1
  }
  return like
}
`
const MODULE_ID = '/src/like-button.tsx'
// The reference key the rsc environment assigns at render time; this is the key
// the revive path looks up in the generated manifest.
const ACTION_KEY = 'a1b2c3d4'
// The rsc transform hoists an inline action to a generated export name; mirror
// that shape so the fixture matches real transform output rather than `default`.
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

  // RENDER: register the inline action the way the rsc environment does. We seed
  // this rather than run the rsc transform because that path calls resolvePackage
  // (require.resolve of the built runtime), which would couple the unit test to a
  // prior dist build. The delete (the bug) and the manifest generator below are
  // the real plugin internals.
  manager.serverReferenceMetaMap[MODULE_ID] = {
    importId: MODULE_ID,
    referenceKey: ACTION_KEY,
    exportNames: [EXPORT_NAME],
  }

  // The non-rsc build/scan pass re-runs over the same module.
  async function runNonRscPass(environment: EnvironmentName) {
    const ctx = {
      environment: { name: environment, mode },
    } as Rollup.TransformPluginContext
    await transform.call(ctx, INLINE_ACTION_MODULE, MODULE_ID, {
      moduleType: 'js',
    })
  }

  // Generate the server-references manifest the revive path resolves against.
  async function manifestCode() {
    const ctx = { environment: { mode } }
    const result = await loadManifest.call(
      ctx,
      '\0virtual:vite-rsc/server-references',
      undefined,
    )
    return typeof result === 'string' ? result : result.code
  }

  return { manager, runNonRscPass, manifestCode }
}

describe('rsc:use-server inline action (render -> cache -> revive)', () => {
  it('build: the action stays in the manifest so revive can resolve it', async () => {
    const { runNonRscPass, manifestCode } = setup('build')
    await runNonRscPass('ssr')
    await runNonRscPass('client')

    // Revive looks up serverReferences[ACTION_KEY]; the key (and its importer)
    // must be present, or the action throws "server reference not found".
    const code = await manifestCode()
    expect(code).toContain(`"${ACTION_KEY}":`)
    expect(code).toContain(MODULE_ID)
    expect(code).toContain(EXPORT_NAME) // importer destructures the hoisted export
  })

  it('dev: the non-rsc pass still cleans up the entry (removed-directive HMR)', async () => {
    const { manager, runNonRscPass, manifestCode } = setup('serve')
    await runNonRscPass('ssr')
    // The delete still runs in dev -- this is the HMR cleanup the gate preserves.
    expect(manager.serverReferenceMetaMap[MODULE_ID]).toBeUndefined()
    // And dev resolves references by import, so the manifest is empty regardless.
    expect(await manifestCode()).toBe('export {}')
  })
})
