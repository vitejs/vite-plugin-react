import {
  createServerDecodeClientManifest,
  createServerManifest,
} from '../../core/rsc'
import type { ServerConsumerManifest } from '../../types'

export type CreateFromStreamExtraOptions = {
  /**
   * Preserve server references for re-serialization without loading their modules.
   * Preserved references cannot be invoked in the current RSC environment.
   *
   * Disabled by default because this API also decodes bound server action
   * arguments, which must revive references as callable implementations.
   *
   * @experimental
   * @default false
   */
  preserveServerReferences?: boolean
}

export function createServerConsumerManifest(
  options?: CreateFromStreamExtraOptions,
): ServerConsumerManifest {
  return {
    // https://github.com/facebook/react/pull/31300
    // https://github.com/vercel/next.js/pull/71527
    serverModuleMap: createServerManifest({
      preserveServerReferences: options?.preserveServerReferences,
    }),
    moduleMap: createServerDecodeClientManifest(),
  }
}
