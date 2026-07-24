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
  string,
  Map<string, Map<string, ServerReferenceMeta>>
>

export class ServerReferencesManager {
  private claimMap: ServerReferenceClaimMap = new Map()
  private metaMap: Record<string, ServerReferenceMeta> = {}

  constructor(private manager: RscPluginManager) {}

  resolve(id: string, serverEnvironmentName: string): ServerReferenceMeta {
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
    environmentName: string,
    id: string,
    meta: ServerReferenceMeta | undefined,
  ): void {
    const claimId = this.normalizeId(id)
    let ownerMap = this.claimMap.get(claimId)
    if (meta?.exportNames.length) {
      if (this.manager.config.command !== 'build' && ownerMap) {
        const identityChanged = [...ownerMap.values()].some((environmentMap) =>
          [...environmentMap.values()].some(
            (claim) =>
              claim.importId === meta.importId &&
              claim.referenceKey !== meta.referenceKey,
          ),
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
      let environmentMap = ownerMap.get(owner)
      if (!environmentMap) {
        environmentMap = new Map()
        ownerMap.set(owner, environmentMap)
      }
      environmentMap.set(environmentName, meta)
    } else if (ownerMap) {
      const environmentMap = ownerMap.get(owner)
      environmentMap?.delete(environmentName)
      if (environmentMap?.size === 0) ownerMap.delete(owner)
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
    for (const [claimOwner, environmentMap] of ownerMap) {
      for (const claim of environmentMap.values()) {
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
    }
    assert(aggregate)
    aggregate.exportNames = [...exportOwners.keys()].sort()
    this.metaMap[claimId] = aggregate
  }

  clearClaims(owner: string, id: string): void {
    const environmentNames = [
      ...(this.claimMap.get(this.normalizeId(id))?.get(owner)?.keys() ?? []),
    ]
    for (const environmentName of environmentNames) {
      this.replaceClaim(owner, environmentName, id, undefined)
    }
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
