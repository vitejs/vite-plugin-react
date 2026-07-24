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
      const import_ = serverReferences[id]
      if (!import_) {
        throw new Error(`server reference not found '${id}'`)
      }
      return import_()
    }
  },
})
