import assert from 'node:assert'
import path from 'node:path'
import MagicString from 'magic-string'
import { stripLiteral } from 'strip-literal'
import type { Plugin } from 'vite'
import type { RscPluginManager } from '../plugin'
import { evalValue } from './vite-utils'

export const ENV_IMPORTS_MANIFEST_NAME = '__vite_rsc_env_imports_manifest.js'
export const ENV_IMPORTS_ENTRY_FALLBACK =
  'virtual:vite-rsc/env-imports-entry-fallbacks'

export type EnvironmentImportMeta = {
  resolvedId: string
  targetEnv: string
  sourceEnv: string
  specifier: string
  entryName: string
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
          if (name === 'ssr' || name === 'rsc') {
            // ensure at least one entry since otherwise rollup build fails
            if (!config.build?.rollupOptions?.input) {
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
          }
        },
      },
      resolveId(source) {
        // Mark manifest imports as external during build
        // The actual file is generated in buildApp after all builds complete
        if (
          this.environment.mode === 'build' &&
          source.endsWith(ENV_IMPORTS_MANIFEST_NAME)
        ) {
          return { id: './' + ENV_IMPORTS_MANIFEST_NAME, external: true }
        }
        // Virtual scan placeholder for scan builds without entries
        if (source === ENV_IMPORTS_ENTRY_FALLBACK) {
          return '\0' + ENV_IMPORTS_ENTRY_FALLBACK
        }
      },
      load(id) {
        if (id === '\0' + ENV_IMPORTS_ENTRY_FALLBACK) {
          return 'export default () => "__vite_rsc_env_imports_entry_fallback"'
        }
      },
      buildStart() {
        // Emit discovered entries during build
        if (this.environment.mode !== 'build') return

        for (const meta of Object.values(manager.environmentImportMetaMap)) {
          if (meta.targetEnv === this.environment.name) {
            this.emitFile({
              type: 'chunk',
              id: meta.resolvedId,
              name: meta.entryName,
            })
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

            // TODO: shouldn't be necessary. replace with internal ID.
            // Derive entry name from specifier (e.g., './entry.ssr.tsx' -> 'entry.ssr')
            const entryName = deriveEntryName(specifier)

            // Track discovered entry
            manager.environmentImportMetaMap[resolvedId] = {
              resolvedId,
              targetEnv: environmentName,
              sourceEnv: this.environment.name,
              specifier,
              entryName,
            }

            let replacement: string
            if (this.environment.mode === 'dev') {
              replacement = `globalThis.__VITE_ENVIRONMENT_RUNNER_IMPORT__(${JSON.stringify(environmentName)}, ${JSON.stringify(resolvedId)})`
            } else {
              // Build: emit manifest lookup with static import
              // The manifest is generated in buildApp after all builds complete
              replacement = `(await import(${JSON.stringify('./' + ENV_IMPORTS_MANIFEST_NAME)})).default[${JSON.stringify(resolvedId)}]()`
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

      generateBundle(_options, bundle) {
        // Track output filenames for discovered environment imports
        // This runs in both RSC and SSR builds to capture all outputs
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (chunk.type === 'chunk' && chunk.isEntry && chunk.facadeModuleId) {
            const resolvedId = chunk.facadeModuleId
            if (resolvedId in manager.environmentImportMetaMap) {
              manager.environmentImportOutputMap[resolvedId] = fileName
            }
          }
        }
      },
    },
  ]
}

function deriveEntryName(specifier: string): string {
  // Remove leading ./ or ../
  let name = specifier.replace(/^\.\.?\//, '')
  // Remove extension
  name = name.replace(/\.[^.]+$/, '')
  // Get basename if it's a path
  name = path.basename(name)
  return name
}
