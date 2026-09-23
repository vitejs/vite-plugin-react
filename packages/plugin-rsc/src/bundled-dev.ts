import fs from 'node:fs'
import path from 'node:path'
import { type DevEnvironment, isCSSRequest, normalizePath } from 'vite'
import { withResolvedIdProxy } from './plugins/resolved-id-proxy'
import { parseIdQuery } from './plugins/shared'
import { cleanUrl } from './plugins/vite-utils'

export type BundledDevServerGraph = {
  moduleIds: Set<string>
  cssImports: Set<string>
  assetImports: Set<string>
}

export async function crawlBundledDevServerGraph(
  environment: DevEnvironment,
  sources: string[],
): Promise<BundledDevServerGraph> {
  const moduleIds = new Set<string>()
  const cssImports = new Set<string>()
  const assetImports = new Set<string>()
  const config = environment.getTopLevelConfig()

  async function crawl(source: string): Promise<void> {
    const resolved = await environment.pluginContainer.resolveId(source)
    if (!resolved || resolved.external || moduleIds.has(resolved.id)) return
    moduleIds.add(resolved.id)
    if (resolved.id.includes('virtual:vite-rsc/assets-manifest')) return

    const { filename, query } = parseIdQuery(resolved.id)
    let file = fs.existsSync(filename) ? filename : undefined
    if (!file && filename.startsWith('/') && config.publicDir) {
      const publicFile = path.join(config.publicDir, filename.slice(1))
      if (fs.existsSync(publicFile)) file = publicFile
    }
    file = file && normalizePath(file)
    const hasRawQuery = 'raw' in query
    const hasInlineQuery = 'inline' in query
    const hasUrlQuery = 'url' in query
    const isCss = isCSSRequest(resolved.id)
    const isAsset = config.assetsInclude(filename) || hasUrlQuery
    const isResource =
      isCss || isAsset || hasRawQuery || hasInlineQuery || hasUrlQuery
    if (file && isResource) {
      if (isCss && !hasRawQuery && !hasInlineQuery && !hasUrlQuery) {
        cssImports.add(resolved.id)
      } else if (isAsset && !hasRawQuery && !hasInlineQuery) {
        assetImports.add(resolved.id)
      }
      return
    }

    const requestId =
      environment.moduleGraph.getModuleById(resolved.id)?.url ?? resolved.id
    const result = await environment.transformRequest(requestId)
    await environment.waitForRequestsIdle()
    const module = environment.moduleGraph.getModuleById(resolved.id)
    if (!module) return

    for (const imported of module.importedModules) {
      await crawl(imported.url)
    }
    for (const imported of [
      ...(result?.deps ?? []),
      ...(result?.dynamicDeps ?? []),
    ]) {
      await crawl(imported)
    }
  }

  for (const source of sources) {
    await crawl(source)
  }
  return {
    moduleIds,
    cssImports,
    assetImports,
  }
}

type ClientReference = {
  importId: string
  referenceKey: string
}

export function filterBundledDevClientReferences<T extends ClientReference>(
  references: Record<string, T>,
  moduleIds: Set<string>,
): Record<string, T> {
  const reachableIds = new Set(
    [...moduleIds].map((id) => normalizePath(cleanUrl(id))),
  )
  return Object.fromEntries(
    Object.entries(references).filter(([id]) =>
      reachableIds.has(normalizePath(cleanUrl(id))),
    ),
  )
}

export function renderBundledDevClientReferences(
  graph: BundledDevServerGraph,
  references: Record<string, ClientReference>,
): string {
  const entries: string[] = []
  let imports = ''
  for (const [index, meta] of Object.values(references)
    .sort((a, b) => a.referenceKey.localeCompare(b.referenceKey))
    .entries()) {
    const name = `__vite_rsc_client_reference_${index}`
    imports += `import * as ${name} from ${JSON.stringify(withResolvedIdProxy(meta.importId))};\n`
    entries.push(
      `${JSON.stringify(meta.referenceKey)}: () => Promise.resolve(${name})`,
    )
  }
  for (const id of [...graph.cssImports].sort()) {
    imports += `import ${JSON.stringify(withResolvedIdProxy(id))};\n`
  }
  const assets = [...graph.assetImports].sort().map((id, index) => {
    const name = `__vite_rsc_server_asset_${index}`
    imports += `import ${name} from ${JSON.stringify(withResolvedIdProxy(id))};\n`
    return name
  })
  if (assets.length > 0) {
    entries.push(
      `[Symbol.for("vite-rsc:server-assets")]: [${assets.join(', ')}]`,
    )
  }
  return `${imports}export default {\n${entries.join(',\n')}\n};\n`
}
