import assert from 'node:assert'
import path from 'node:path'
import MagicString from 'magic-string'
import { stripLiteral } from 'strip-literal'
import type { Plugin } from 'vite'
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
  fileName?: string
}

export function vitePluginImportEnvironment(
  manager: RscPluginManager,
): Plugin[] {
  return [
    {
      name: 'rsc:import-environment',
      configEnvironment: {
        order: 'post',
        handler(name, config, _env) {
          if (name === 'client') return
          // ensure at least one entry since otherwise rollup build fails
          const input = normalizeRollupOpitonsInput(
            config.build?.rollupOptions?.input,
          )
          if (Object.keys(input).length === 0) {
            return {
              build: {
                rollupOptions: {
                  input: {
                    __vite_rsc_env_imports_entry_fallback:
                      ENV_IMPORTS_ENTRY_FALLBACK,
                  },
                },
              },
            }
          }
        },
      },
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
        for (const imports of Object.values(manager.environmentImportMetaMap)) {
          for (const meta of Object.values(imports)) {
            if (
              meta.targetEnv === this.environment.name &&
              !emitted.has(meta.resolvedId)
            ) {
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

            // TODO: environmentImportMetaMap structure seems still awkward
            // should be [sourceEnv][targetEnv][resolvedId]

            // Track discovered entry, keyed by [sourceEnv][resolvedId]
            const sourceEnv = this.environment.name
            manager.environmentImportMetaMap[sourceEnv] ??= {}
            manager.environmentImportMetaMap[sourceEnv]![resolvedId] ??= {
              resolvedId,
              targetEnv: environmentName,
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

      generateBundle(_options, bundle) {
        if (this.environment.name === 'client') return

        // TODO: delay `fileName` assigment to right before writeEnvironmentImportsManifest
        // TODO: we can just hold old `bundles: Record<string, ..>` in manager

        // Track output filenames for discovered environment imports
        // Only set fileName when this bundle's environment matches the target
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (chunk.type === 'chunk' && chunk.isEntry && chunk.facadeModuleId) {
            const resolvedId = chunk.facadeModuleId
            for (const imports of Object.values(
              manager.environmentImportMetaMap,
            )) {
              const meta = imports[resolvedId]
              if (meta && meta.targetEnv === this.environment.name) {
                meta.fileName = fileName
              }
            }
          }
        }
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
