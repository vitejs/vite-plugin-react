import * as ReactDOM from 'react-dom'
import assetsManifest from 'virtual:vite-rsc/assets-manifest'
import * as clientReferences from 'virtual:vite-rsc/client-references'
import { setRequireModule } from './core/ssr'
import type { ResolvedAssetDeps } from './plugin'
import { toCssVirtual, toReferenceValidationVirtual } from './plugins/shared'

export { createServerConsumerManifest } from './core/ssr'

export * from './react/ssr'

/**
 * Callback type for client reference dependency notifications.
 * Called during SSR when a client component's dependencies are loaded.
 * @experimental
 */
export type OnClientReference = (reference: {
  id: string
  deps: ResolvedAssetDeps
}) => void

// Registered callback for client reference deps
let onClientReference: OnClientReference | undefined

/**
 * Register a callback to be notified when client reference dependencies are loaded.
 * Called during SSR when a client component is accessed.
 * @experimental
 */
export function setOnClientReference(
  callback: OnClientReference | undefined,
): void {
  onClientReference = callback
}

initialize()

function initialize(): void {
  setRequireModule({
    load: async (id) => {
      if (!import.meta.env.__vite_rsc_build__) {
        await import(
          /* @vite-ignore */ '/@id/__x00__' +
            toReferenceValidationVirtual({ id, type: 'client' })
        )
        const mod = await import(/* @vite-ignore */ id)
        const modCss = await import(
          /* @vite-ignore */ '/@id/__x00__' + toCssVirtual({ id, type: 'ssr' })
        )
        return wrapResourceProxy(mod, id, { js: [], css: modCss.default })
      } else {
        const import_ = clientReferences.default[id]
        if (!import_) {
          throw new Error(`client reference not found '${id}'`)
        }
        const deps = assetsManifest.clientReferenceDeps[id] ?? {
          js: [],
          css: [],
        }
        // kick off preload/notify before initial async import, which is not sync-cached
        preloadDeps(deps)
        onClientReference?.({ id, deps })
        const mod: any = await import_()
        return wrapResourceProxy(mod, id, deps)
      }
    },
  })
}

// preload/preinit during getter access since `load` is cached on production.
// also notify `onClientReference` callback here since module export access is not memoized by React.
function wrapResourceProxy(mod: any, id: string, deps: ResolvedAssetDeps) {
  return new Proxy(mod, {
    get(target, p, receiver) {
      if (p in mod) {
        preloadDeps(deps)
        onClientReference?.({ id, deps })
      }
      return Reflect.get(target, p, receiver)
    },
  })
}

// Ensure serverResources CSS is registered before clientReferenceDeps CSS
// so that React discovers the "importer-resources" precedence group first.
// Without this, on the first request the client reference's `load()` can call
// `preloadDeps()` before the RSC stream's `<Resources>` component renders,
// causing "client-reference" to be discovered first and shared CSS URLs to be
// deduplicated under the wrong precedence group.
function preinitServerResources() {
  if (!assetsManifest.serverResources) return
  if (assetsManifest.cssLinkPrecedence === false) return
  for (const resource of Object.values(assetsManifest.serverResources)) {
    for (const href of resource.css) {
      ReactDOM.preinit(href, {
        as: 'style',
        precedence: 'vite-rsc/importer-resources',
      })
    }
  }
}

function preloadDeps(deps: ResolvedAssetDeps) {
  for (const href of deps.js) {
    ReactDOM.preloadModule(href, {
      as: 'script',
      // vite doesn't allow configuring crossorigin at the moment, so we can hard code it as well.
      // https://github.com/vitejs/vite/issues/6648
      crossOrigin: '',
    })
  }
  // register serverResources precedence before client CSS
  preinitServerResources()
  for (const href of deps.css) {
    ReactDOM.preinit(href, {
      as: 'style',
      precedence:
        assetsManifest.cssLinkPrecedence !== false
          ? 'vite-rsc/client-reference'
          : undefined,
    })
  }
}
