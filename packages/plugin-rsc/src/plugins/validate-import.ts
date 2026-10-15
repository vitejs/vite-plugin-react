import path from 'node:path'
import { prefixRegex } from '@rolldown/pluginutils'
import type { DevEnvironment, Plugin, Rollup } from 'vite'
import type { RscPluginManager } from '../plugin'

// https://github.com/vercel/next.js/blob/90f564d376153fe0b5808eab7b83665ee5e08aaf/packages/next/src/build/webpack-config.ts#L1249-L1280
// https://github.com/pcattori/vite-env-only/blob/68a0cc8546b9a37c181c0b0a025eb9b62dbedd09/src/deny-imports.ts
// https://github.com/sveltejs/kit/blob/84298477a014ec471839adf7a4448d91bc7949e4/packages/kit/src/exports/vite/index.js#L513
export function validateImportPlugin({
  manager,
}: {
  manager: RscPluginManager
}): Plugin {
  return {
    name: 'rsc:validate-imports',
    resolveId: {
      order: 'pre',
      filter: { id: /^(client-only|server-only)$/ },
      async handler(source, _importer, options) {
        // optimizer is not aware of server/client boudnary so skip
        if ('scan' in options && options.scan) {
          return
        }

        // Validate client-only imports in server environments
        if (source === 'client-only' || source === 'server-only') {
          if (
            (source === 'client-only' && this.environment.name === 'rsc') ||
            (source === 'server-only' && this.environment.name !== 'rsc')
          ) {
            return {
              id: `\0virtual:vite-rsc/validate-imports/invalid/${source}`,
              moduleSideEffects: true,
            }
          }
          return {
            id: `\0virtual:vite-rsc/validate-imports/valid/${source}`,
            moduleSideEffects: false,
          }
        }

        return
      },
    },
    load: {
      filter: { id: prefixRegex('\0virtual:vite-rsc/validate-imports/') },
      handler(id) {
        if (id.startsWith('\0virtual:vite-rsc/validate-imports/invalid/')) {
          // it should surface as build error but we make a runtime error just in case.
          const source = id.slice(id.lastIndexOf('/') + 1)
          return `throw new Error("invalid import of '${source}'")`
        }
        if (id.startsWith('\0virtual:vite-rsc/validate-imports/')) {
          return `export {}`
        }
      },
    },
    // for dev, use DevEnvironment.moduleGraph during post transform
    transform: {
      order: 'post',
      filter: {
        id: prefixRegex('\0virtual:vite-rsc/validate-imports/invalid/'),
      },
      async handler(_code, id) {
        if (this.environment.mode === 'dev') {
          if (id.startsWith(`\0virtual:vite-rsc/validate-imports/invalid/`)) {
            const chain = getImportChainDev(this.environment, id)
            validateImportChain(
              chain,
              this.environment.name,
              this.environment.config.root,
            )
          }
        }
      },
    },
    // for build, check the output after tree-shaking. the invalid module has
    // side effects, so it stays in the output exactly when a retained module
    // imports it. checking the module graph earlier (e.g. in `buildEnd`) would
    // also reject imports that tree-shaking drops, such as an unused leaf of
    // a `sideEffects: false` barrel package.
    generateBundle(_options, bundle) {
      // scan build strips modules down to their imports, so it doesn't
      // reflect what the real build keeps. the real build does the check.
      if (manager.isScanBuild) return
      const retained = new Set<string>()
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') {
          for (const id of output.moduleIds) {
            retained.add(id)
          }
        }
      }
      for (const source of ['server-only', 'client-only']) {
        const id = `\0virtual:vite-rsc/validate-imports/invalid/${source}`
        if (retained.has(id)) {
          validateImportChain(
            getImportChainBuild(this, id, retained),
            this.environment.name,
            this.environment.config.root,
          )
        }
      }
    },
  }
}

function getImportChainDev(environment: DevEnvironment, id: string) {
  const chain: string[] = []
  const recurse = (id: string) => {
    if (chain.includes(id)) return
    const info = environment.moduleGraph.getModuleById(id)
    if (!info) return
    chain.push(id)
    const next = [...info.importers][0]
    if (next && next.id) {
      recurse(next.id)
    }
  }
  recurse(id)
  return chain
}

function getImportChainBuild(
  ctx: Rollup.PluginContext,
  id: string,
  retained: Set<string>,
): string[] {
  const chain: string[] = []
  const recurse = (id: string) => {
    if (chain.includes(id)) return
    const info = ctx.getModuleInfo(id)
    if (!info) return
    chain.push(id)
    // prefer an importer kept in the output over one dropped by tree-shaking
    // so that the chain shows which import actually kept the invalid module.
    const importers = [...info.importers, ...info.dynamicImporters]
    const next =
      importers.find((id) => retained.has(id) && !chain.includes(id)) ??
      importers[0]
    if (next) {
      recurse(next)
    }
  }
  recurse(id)
  return chain
}

function validateImportChain(
  chain: string[],
  environmentName: string,
  root: string,
) {
  if (chain.length === 0) return
  const id = chain[0]!
  const source = id.slice(id.lastIndexOf('/') + 1)
  const buildName = source === 'server-only' ? 'client' : 'server'
  let result = `'${source}' cannot be imported in ${buildName} build ('${environmentName}' environment):\n`
  result += chain
    .slice(1, 6)
    .map(
      (id, i) =>
        ' '.repeat(i + 1) +
        `imported by ${path.relative(root, id).replaceAll('\0', '')}\n`,
    )
    .join('')
  if (chain.length > 6) {
    result += ' '.repeat(7) + '...\n'
  }
  const error = new Error(result)
  if (chain[1]) {
    Object.assign(error, { id: chain[1] })
  }
  throw error
}
