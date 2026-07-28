import type { Rollup } from 'vite'
import type { RscPluginManager } from '../plugin'
import { sortObject } from './utils'

/**
 * Server references reachable from a Client Component reference through the
 * final client module graph.
 *
 * Reachability includes static and statically resolved dynamic imports. It is
 * conservative at module granularity, so all server references exported by a
 * reachable server-reference module are included.
 *
 * @experimental
 */
export type ClientReferenceToServerReferenceReachability = {
  /** Resolved module ID used as the client graph traversal root. */
  importId: string
  /** Reference key identifying the Client Component across environments. */
  referenceKey: string
  /** Complete server-reference IDs in `referenceKey#exportName` form. */
  serverReferenceIds: string[]
}

export function getClientReferenceServerReferences(
  context: Rollup.PluginContext,
  manager: RscPluginManager,
): Record<string, ClientReferenceToServerReferenceReachability> {
  const result: Record<string, ClientReferenceToServerReferenceReachability> =
    {}
  for (const clientReference of Object.values(manager.clientReferenceMetaMap)) {
    const serverReferenceIds = new Set<string>()
    const visited = new Set<string>()
    const queue = [clientReference.importId]
    for (let index = 0; index < queue.length; index++) {
      const id = queue[index]!
      if (visited.has(id)) continue
      visited.add(id)

      const serverReference = manager.serverReferences.metaMap.get(id)
      if (serverReference) {
        for (const exportName of serverReference.exportNames) {
          serverReferenceIds.add(
            `${serverReference.referenceKey}#${exportName}`,
          )
        }
      }

      const info = context.getModuleInfo(id)
      if (!info) continue
      queue.push(...info.importedIds, ...info.dynamicallyImportedIds)
    }

    result[clientReference.importId] = {
      importId: clientReference.importId,
      referenceKey: clientReference.referenceKey,
      serverReferenceIds: [...serverReferenceIds].sort(),
    }
  }
  return sortObject(result)
}
