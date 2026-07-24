import assert from 'node:assert'
import type { RscPluginManager } from '../plugin'
import { hashString } from './utils'
import { cleanUrl, normalizeViteImportAnalysisUrl } from './vite-utils'

export type ServerReferenceMeta = {
  importId: string
  referenceKey: string
  // TODO: tree shake unused server functions
  exportNames: string[]
}

type ServerReferenceClaimMap = DefaultMap<
  // normalized import ID
  string,
  Map<
    // claim owner
    string,
    ServerReferenceMeta
  >
>

export class ServerReferencesManager {
  claimMap: ServerReferenceClaimMap = new DefaultMap(() => new Map())
  metaMap: Map<string, ServerReferenceMeta> = new Map()

  constructor(private manager: RscPluginManager) {}

  resolve(id: string, serverEnvironmentName: string): ServerReferenceMeta {
    const importId = this.normalizeImportId(id)
    const referenceKey =
      this.manager.config.command === 'build'
        ? hashString(this.manager.toRelativeId(importId))
        : normalizeViteImportAnalysisUrl(
            this.manager.server.environments[serverEnvironmentName]!,
            importId,
          )
    return { importId, referenceKey, exportNames: [] }
  }

  replaceClaim(owner: string, meta: ServerReferenceMeta): void {
    this.claimMap.get(meta.importId).set(owner, meta)
    this.metaMap = deriveMetaMap(this.claimMap)
  }

  deleteClaim(owner: string, id: string): void {
    const importId = this.normalizeImportId(id)
    const ownerMap = this.claimMap.get(importId)
    ownerMap.delete(owner)
    if (ownerMap.size === 0) {
      this.claimMap.delete(importId)
    }
    this.metaMap = deriveMetaMap(this.claimMap)
  }

  findByReferenceKey(referenceKey: string): ServerReferenceMeta | undefined {
    for (const meta of this.metaMap.values()) {
      if (meta.referenceKey === referenceKey) return meta
    }
  }

  private normalizeImportId(id: string): string {
    return this.manager.config.command !== 'build' &&
      id.includes('/node_modules/')
      ? cleanUrl(id)
      : id
  }
}

function deriveMetaMap(
  claimMap: ServerReferenceClaimMap,
): Map<string, ServerReferenceMeta> {
  const metaMap = new Map<string, ServerReferenceMeta>()
  for (const [importId, claims] of claimMap) {
    metaMap.set(importId, aggregateClaims(importId, claims))
  }
  return metaMap
}

function aggregateClaims(
  importId: string,
  claims: Map<string, ServerReferenceMeta>,
): ServerReferenceMeta {
  let aggregate: ServerReferenceMeta | undefined
  const exportOwners = new Map<string, string>()
  for (const [claimOwner, claim] of claims) {
    // A mismatch indicates incompatible plugin integration claims, not an
    // application authoring error.
    if (!aggregate) {
      aggregate = {
        importId: claim.importId,
        referenceKey: claim.referenceKey,
        exportNames: [],
      }
    } else if (
      aggregate.importId !== claim.importId ||
      aggregate.referenceKey !== claim.referenceKey
    ) {
      throw new Error(
        `[vite-rsc] conflicting server reference identity for '${importId}'`,
      )
    }
    for (const name of claim.exportNames) {
      const existingOwner = exportOwners.get(name)
      if (existingOwner && existingOwner !== claimOwner) {
        throw new Error(
          `[vite-rsc] server reference '${claim.referenceKey}#${name}' is claimed by both '${existingOwner}' and '${claimOwner}'`,
        )
      }
      exportOwners.set(name, claimOwner)
    }
  }
  assert(aggregate)
  aggregate.exportNames = [...exportOwners.keys()].sort()
  return aggregate
}

class DefaultMap<K, V> extends Map<K, V> {
  constructor(private createDefault: (key: K) => V) {
    super()
  }

  override get(key: K): V {
    if (super.has(key)) {
      return super.get(key)!
    }
    const value = this.createDefault(key)
    this.set(key, value)
    return value
  }
}
