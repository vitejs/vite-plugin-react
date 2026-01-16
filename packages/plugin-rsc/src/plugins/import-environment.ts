import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import MagicString from 'magic-string'
import { stripLiteral } from 'strip-literal'
import type { Plugin, ResolvedConfig } from 'vite'
import type { RscPluginManager } from '../plugin'
import {
  createVirtualPlugin,
  normalizeRelativePath,
  normalizeRollupOpitonsInput,
} from './utils'
import { evalValue } from './vite-utils'

export const ENV_IMPORTS_MANIFEST_NAME = '__vite_rsc_env_imports_manifest.js'

const ENV_IMPORTS_MANIFEST_PLACEHOLDER = 'virtual:vite-rsc/env-imports-manifest'
const ENV_IMPORTS_ENTRY_FALLBACK = 'virtual:vite-rsc/env-imports-entry-fallback'

export type EnvironmentImportMeta = {
  resolvedId: string
  targetEnv: string
  sourceEnv: string
  specifier: string
}

// ensure at least one entry since otherwise rollup build fails
export function ensureEnvironmentImportsEntryFallback({
  environments,
}: ResolvedConfig): void {
  for (const [name, config] of Object.entries(environments)) {
    if (name === 'client') continue
    const input = normalizeRollupOpitonsInput(
      config.build?.rollupOptions?.input,
    )
    if (Object.keys(input).length === 0) {
      config.build = config.build || {}
      config.build.rollupOptions = config.build.rollupOptions || {}
      config.build.rollupOptions.input = {
        __vite_rsc_env_imports_entry_fallback: ENV_IMPORTS_ENTRY_FALLBACK,
      }
    }
  }
}

export function vitePluginImportEnvironment(
  manager: RscPluginManager,
): Plugin[] {
  return [
    {
      name: 'rsc:import-environment',
      resolveId(source) {
        // Use placeholder as external, renderChunk will replace with correct relative path
        if (source === ENV_IMPORTS_MANIFEST_PLACEHOLDER) {
          return { id: ENV_IMPORTS_MANIFEST_PLACEHOLDER, external: true }
        }
      },
      buildStart() {
        // Emit discovered entries during build
        if (this.environment.mode !== 'build') return

        // Collect unique entries targeting this environment (may be imported from multiple sources)
        const emitted = new Set<string>()
        for (const byTargetEnv of Object.values(
          manager.environmentImportMetaMap,
        )) {
          const imports = byTargetEnv[this.environment.name]
          if (!imports) continue
          for (const meta of Object.values(imports)) {
            if (!emitted.has(meta.resolvedId)) {
              emitted.add(meta.resolvedId)
              this.emitFile({
                type: 'chunk',
                id: meta.resolvedId,
              })
            }
          }
        }
      },
      transform: {
        async handler(code, id) {
          if (!code.includes('import.meta.viteRsc.import')) return

          const { server } = manager
          const s = new MagicString(code)

          for (const match of stripLiteral(code).matchAll(
            /import\.meta\.viteRsc\.import\s*(<[\s\S]*?>)?\s*\(([\s\S]*?)\)/dg,
          )) {
            // match[2] is the arguments (after optional type parameter)
            const [argStart, argEnd] = match.indices![2]!
            const argCode = code.slice(argStart, argEnd).trim()

            // Parse: ('./entry.ssr', { environment: 'ssr' })
            const [specifier, options]: [string, { environment: string }] =
              evalValue(`[${argCode}]`)
            const environmentName = options.environment

            // Resolve specifier relative to importer
            let resolvedId: string
            if (this.environment.mode === 'dev') {
              const targetEnv = server.environments[environmentName]
              assert(
                targetEnv,
                `[vite-rsc] unknown environment '${environmentName}'`,
              )
              const resolved = await targetEnv.pluginContainer.resolveId(
                specifier,
                id,
              )
              assert(
                resolved,
                `[vite-rsc] failed to resolve '${specifier}' in environment '${environmentName}'`,
              )
              resolvedId = resolved.id
            } else {
              // Build mode: resolve in target environment config
              const targetEnvConfig =
                manager.config.environments[environmentName]
              assert(
                targetEnvConfig,
                `[vite-rsc] unknown environment '${environmentName}'`,
              )
              // Use this environment's resolver for now
              const resolved = await this.resolve(specifier, id)
              assert(
                resolved,
                `[vite-rsc] failed to resolve '${specifier}' in environment '${environmentName}'`,
              )
              resolvedId = resolved.id
            }

            // Track discovered entry, keyed by [sourceEnv][targetEnv][resolvedId]
            const sourceEnv = this.environment.name
            const targetEnv = environmentName
            manager.environmentImportMetaMap[sourceEnv] ??= {}
            manager.environmentImportMetaMap[sourceEnv]![targetEnv] ??= {}
            manager.environmentImportMetaMap[sourceEnv]![targetEnv]![
              resolvedId
            ] = {
              resolvedId,
              targetEnv,
              sourceEnv,
              specifier,
            }

            let replacement: string
            if (this.environment.mode === 'dev') {
              replacement = `globalThis.__VITE_ENVIRONMENT_RUNNER_IMPORT__(${JSON.stringify(environmentName)}, ${JSON.stringify(resolvedId)})`
            } else {
              // Build: emit manifest lookup with static import
              // The manifest is generated in buildApp after all builds complete
              // Use placeholder that renderChunk will replace with correct relative path
              // Use relative ID for stable builds across different machines
              const relativeId = manager.toRelativeId(resolvedId)
              replacement = `(await import(${JSON.stringify(ENV_IMPORTS_MANIFEST_PLACEHOLDER)})).default[${JSON.stringify(relativeId)}]()`
            }

            const [start, end] = match.indices![0]!
            s.overwrite(start, end, replacement)
          }

          if (s.hasChanged()) {
            return {
              code: s.toString(),
              map: s.generateMap({ hires: 'boundary' }),
            }
          }
        },
      },

      renderChunk(code, chunk) {
        if (code.includes(ENV_IMPORTS_MANIFEST_PLACEHOLDER)) {
          const replacement = normalizeRelativePath(
            path.relative(
              path.join(chunk.fileName, '..'),
              ENV_IMPORTS_MANIFEST_NAME,
            ),
          )
          code = code.replaceAll(
            ENV_IMPORTS_MANIFEST_PLACEHOLDER,
            () => replacement,
          )
          return { code }
        }
        return
      },
    },
    createVirtualPlugin(
      ENV_IMPORTS_ENTRY_FALLBACK.slice('virtual:'.length),
      () => {
        // TODO: how to avoid warning during scan build?
        // > Generated an empty chunk: "__vite_rsc_env_imports_entry_fallback".
        return `export default "__vite_rsc_env_imports_entry_fallback";`
      },
    ),
  ]
}

export function writeEnvironmentImportsManifest(
  manager: RscPluginManager,
): void {
  if (Object.keys(manager.environmentImportMetaMap).length === 0) {
    return
  }

  // Write manifest to each source environment's output
  for (const [sourceEnv, byTargetEnv] of Object.entries(
    manager.environmentImportMetaMap,
  )) {
    const sourceOutDir = manager.config.environments[sourceEnv]!.build.outDir
    const manifestPath = path.join(sourceOutDir, ENV_IMPORTS_MANIFEST_NAME)

    let code = 'export default {\n'
    for (const [_targetEnv, imports] of Object.entries(byTargetEnv)) {
      // Lookup fileName from bundle
      for (const [resolvedId, meta] of Object.entries(imports)) {
        const bundle = manager.bundles[meta.targetEnv]
        const chunk = Object.values(bundle ?? {}).find(
          (c) =>
            c.type === 'chunk' && c.isEntry && c.facadeModuleId === resolvedId,
        )
        if (!chunk) {
          throw new Error(
            `[vite-rsc] missing output for environment import: ${resolvedId}`,
          )
        }
        const targetOutDir =
          manager.config.environments[meta.targetEnv]!.build.outDir
        const relativePath = normalizeRelativePath(
          path.relative(sourceOutDir, path.join(targetOutDir, chunk.fileName)),
        )
        // Use relative ID for stable builds across different machines
        const relativeId = manager.toRelativeId(resolvedId)
        code += `  ${JSON.stringify(relativeId)}: () => import(${JSON.stringify(relativePath)}),\n`
      }
    }
    code += '}\n'

    fs.writeFileSync(manifestPath, code)
  }
}
