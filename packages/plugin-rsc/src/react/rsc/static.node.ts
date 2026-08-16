// @ts-ignore
import * as ReactStaticNode from '@vitejs/plugin-rsc/vendor/react-server-dom/static.node'
import {
  createClientManifest,
  type CreateClientManifestOptions,
} from '../../core/rsc'
import type { RenderToPipeableStreamOptions } from '../../types'

export * from './static'

export interface PrerenderToNodeStreamResult {
  prelude: import('node:stream').Readable
}

export function prerenderToNodeStream<T>(
  data: T,
  options?: RenderToPipeableStreamOptions,
  extraOptions?: CreateClientManifestOptions,
): Promise<PrerenderToNodeStreamResult> {
  return ReactStaticNode.prerenderToNodeStream(
    data,
    createClientManifest({
      onClientReference: extraOptions?.onClientReference,
    }),
    options,
  )
}
