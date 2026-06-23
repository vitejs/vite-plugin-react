import * as ReactDOM from 'react-dom'
import type { ResolvedAssetDeps } from '../plugin'

type PreloadModuleOptionsWithFetchPriority = NonNullable<
  Parameters<typeof ReactDOM.preloadModule>[1]
> & {
  fetchPriority?: 'high' | 'low' | 'auto'
}

export function preloadClientReferenceDeps(
  deps: ResolvedAssetDeps,
  clientEntryJs: readonly string[],
  cssLinkPrecedence: boolean,
): void {
  // Remove this cast once React's public types include fetchPriority.
  const preloadModule = ReactDOM.preloadModule as (
    href: string,
    options: PreloadModuleOptionsWithFetchPriority,
  ) => void

  const clientEntryJsSet = new Set(clientEntryJs)
  for (const href of deps.js) {
    const options: PreloadModuleOptionsWithFetchPriority = {
      as: 'script',
      crossOrigin: '',
    }
    if (!clientEntryJsSet.has(href)) {
      options.fetchPriority = 'low'
    }
    preloadModule(href, options)
  }
  for (const href of deps.css) {
    ReactDOM.preinit(href, {
      as: 'style',
      precedence: cssLinkPrecedence ? 'vite-rsc/client-reference' : undefined,
    })
  }
}
