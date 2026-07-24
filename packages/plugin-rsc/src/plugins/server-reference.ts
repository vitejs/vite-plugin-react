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
  // normalized module ID
  string,
  Map<
    // claim owner
    string,
    ServerReferenceMeta
  >
>

export class ServerReferencesManager {
  private claimMap: ServerReferenceClaimMap = new Map()
  private metaMap: Record<string, ServerReferenceMeta> = {}

  constructor(private manager: RscPluginManager) {}

  resolve(id: string, serverEnvironmentName: string): ServerReferenceMeta {
    // TODO: normalizeId?
    const importId =
      this.manager.config.command !== 'build' && id.includes('/node_modules/')
        ? cleanUrl(id)
        : id
    const referenceKey =
      this.manager.config.command === 'build'
        ? hashString(this.manager.toRelativeId(importId))
        : normalizeViteImportAnalysisUrl(
            this.manager.server.environments[serverEnvironmentName]!,
            importId,
          )
    return { importId, referenceKey, exportNames: [] }
  }

  replaceClaim(
    owner: string,
    id: string,
    meta: ServerReferenceMeta | undefined,
  ): void {
    const claimId = this.normalizeId(id)
    let ownerMap = this.claimMap.get(claimId)
    if (meta?.exportNames.length) {
      if (this.manager.config.command !== 'build' && ownerMap) {
        const identityChanged = [...ownerMap.values()].some(
          (claim) =>
            claim.importId === meta.importId &&
            claim.referenceKey !== meta.referenceKey,
        )
        if (identityChanged) {
          this.claimMap.delete(claimId)
          delete this.metaMap[claimId]
          ownerMap = undefined
        }
      }
      if (!ownerMap) {
        ownerMap = new Map()
        this.claimMap.set(claimId, ownerMap)
      }
      ownerMap.set(owner, meta)
    } else if (ownerMap) {
      ownerMap.delete(owner)
      if (ownerMap.size === 0) this.claimMap.delete(claimId)
    } else {
      return
    }

    ownerMap = this.claimMap.get(claimId)
    if (!ownerMap) {
      delete this.metaMap[claimId]
      return
    }

    let aggregate: ServerReferenceMeta | undefined
    const exportOwners = new Map<string, string>()
    for (const [claimOwner, claim] of ownerMap) {
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
          `[vite-rsc] conflicting server reference identity for '${claimId}'`,
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
    this.metaMap[claimId] = aggregate
  }

  deleteClaim(owner: string, id: string): void {
    this.replaceClaim(owner, id, undefined)
  }

  getMeta(): ServerReferenceMeta[] {
    return Object.values(this.metaMap)
  }

  private normalizeId(id: string): string {
    return this.manager.config.command !== 'build' &&
      id.includes('/node_modules/')
      ? cleanUrl(id)
      : id
  }
}
