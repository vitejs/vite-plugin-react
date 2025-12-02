import * as clientReferences from 'virtual:vite-rsc/client-references'

import { setRequireModule } from './core/browser'

export * from './react/browser'

initialize()

function initialize(): void {
  setRequireModule({
    load: async (id) => {
      if (!import.meta.env.__vite_rsc_build__) {
        // @ts-ignore
        return __vite_rsc_raw_import__(
          withTrailingSlash(import.meta.env.BASE_URL) + id.slice(1),
        )
      } else {
        const import_ = clientReferences.default[id]
        if (!import_) {
          throw new Error(`client reference not found '${id}'`)
        }
        return import_()
      }
    },
  })
}

// Vite normalizes `config.base` to have trailing slash, but not for `import.meta.env.BASE_URL`.
// https://github.com/vitejs/vite/blob/27a192fc95036dbdb6e615a4201b858eb64aa075/packages/vite/src/shared/utils.ts#L48-L53
function withTrailingSlash(path: string): string {
  if (path[path.length - 1] !== '/') {
    return `${path}/`
  }
  return path
}
