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

// TODO: probably some default map trick or some util would make code trivial for human.
type ServerReferenceClaimMap = Map<
  // normalized import ID
  string,
  Map<
    // claim owner
    string,
    ServerReferenceMeta
  >
>

export class ServerReferencesManager {
  private claimMap: ServerReferenceClaimMap = new Map()
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
    const importId = meta.importId
    let ownerMap = this.claimMap.get(importId)
    if (this.manager.config.command !== 'build' && ownerMap) {
      const identityChanged = [...ownerMap.values()].some(
        (claim) =>
          claim.importId === meta.importId &&
          claim.referenceKey !== meta.referenceKey,
      )
      if (identityChanged) {
        this.claimMap.delete(importId)
        ownerMap = undefined
      }
    }
    if (!ownerMap) {
      ownerMap = new Map()
      this.claimMap.set(importId, ownerMap)
    }
    ownerMap.set(owner, meta)
    this.metaMap = deriveMetaMap(this.claimMap)
  }

  deleteClaim(owner: string, id: string): void {
    const importId = this.normalizeImportId(id)
    const ownerMap = this.claimMap.get(importId)
    if (!ownerMap) return
    ownerMap.delete(owner)
    if (ownerMap.size === 0) this.claimMap.delete(importId)
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
  return new Map(
    [...claimMap].map(([importId, claims]) => [
      importId,
      aggregateClaims(importId, claims),
    ]),
  )
}

function aggregateClaims(
  importId: string,
  claims: Map<string, ServerReferenceMeta>,
): ServerReferenceMeta {
  let aggregate: ServerReferenceMeta | undefined
  const exportOwners = new Map<string, string>()
  for (const [claimOwner, claim] of claims) {
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
