import serverReferences from 'virtual:vite-rsc/server-references'
import { setRequireModule } from '../core/rsc'
import { toReferenceValidationVirtual } from '../plugins/shared'

setRequireModule({
  load: async (id) => {
    if (!import.meta.env.__vite_rsc_build__) {
      await import(
        /* @vite-ignore */ '/@id/__x00__' +
          toReferenceValidationVirtual({ id, type: 'server' })
      )
      return import(/* @vite-ignore */ id)
    } else {
      // own keys only: an id such as `__proto__` must not resolve to an
      // inherited member of the registry object
      const import_ = Object.hasOwn(serverReferences, id)
        ? serverReferences[id]
        : undefined
      if (!import_) {
        throw Object.assign(new Error(`server reference not found '${id}'`), {
          code: 'VITE_RSC_SERVER_REFERENCE_NOT_FOUND',
        })
      }
      return import_()
    }
  },
})
