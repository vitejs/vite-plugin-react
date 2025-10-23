import { setRequireModule } from './core/rsc'
import serverReferences from 'virtual:vite-rsc/server-references'

export {
  createClientManifest,
  createServerManifest,
  loadServerAction,
} from './core/rsc'

export {
  encryptActionBoundArgs,
  decryptActionBoundArgs,
} from './utils/encryption-runtime'

export * from './react/rsc'

initialize()

function initialize(): void {
  setRequireModule({
    load: async (id) => {
      if (!import.meta.env.__vite_rsc_build__) {
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
}
