import * as ReactDOM from 'react-dom'
import assetsManifest from 'virtual:vite-rsc/assets-manifest'
import * as clientReferences from 'virtual:vite-rsc/client-references'
import { setRequireModule } from './core/ssr'
import type { ResolvedAssetDeps } from './plugin'
import { toCssVirtual, toReferenceValidationVirtual } from './plugins/shared'

export { createServerConsumerManifest } from './core/ssr'

export * from './react/ssr'

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
        return wrapResourceProxy(mod, { js: [], css: modCss.default })
      } else {
        const import_ = clientReferences.default[id]
        if (!import_) {
          throw new Error(`client reference not found '${id}'`)
        }
        const deps = assetsManifest.clientReferenceDeps[id]
        // kick off preload before initial async import, which is not sync-cached
        if (deps) {
          preloadDeps(deps)
        }
        const mod: any = await import_()
        return wrapResourceProxy(mod, deps)
      }
    },
  })
}

// preload/preinit during getter access since `load` is cached on production
function wrapResourceProxy(mod: any, deps?: ResolvedAssetDeps) {
  return new Proxy(mod, {
    get(target, p, receiver) {
      if (p in mod) {
        if (deps) {
          preloadDeps(deps)
        }
      }
      return Reflect.get(target, p, receiver)
    },
  })
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
