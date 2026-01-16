import assert from 'node:assert'
import path from 'node:path'
import MagicString from 'magic-string'
import { stripLiteral } from 'strip-literal'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { normalizeRelativePath } from './utils'
import { evalValue } from './vite-utils'

export type EnvironmentImportMeta = {
  resolvedId: string
  targetEnv: string
  sourceEnv: string
  specifier: string
  entryName: string
}

interface PluginManager {
  server: ViteDevServer
  config: ResolvedConfig
  environmentImportMetaMap: Record<string, EnvironmentImportMeta>
}

export function vitePluginImportEnvironment(manager: PluginManager): Plugin[] {
  return [
    {
      name: 'rsc:import-environment',
      async transform(code, id) {
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
            const targetEnvConfig = manager.config.environments[environmentName]
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
            // Build: emit marker that will be resolved in renderChunk
            replacement = JSON.stringify(
              `__vite_rsc_import_env_start__:` +
                JSON.stringify({
                  fromEnv: this.environment.name,
                  toEnv: environmentName,
                  entryName,
                }) +
                `:__vite_rsc_import_env_end__`,
            )
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

      renderChunk(code, chunk) {
        if (!code.includes('__vite_rsc_import_env')) return

        const { config } = manager
        const s = new MagicString(code)

        for (const match of code.matchAll(
          /[`'"]__vite_rsc_import_env_start__:([\s\S]*?):__vite_rsc_import_env_end__[`'"]/dg,
        )) {
          const markerString = evalValue(match[0])
          const { fromEnv, toEnv, entryName } = JSON.parse(
            markerString.slice(
              '__vite_rsc_import_env_start__:'.length,
              -':__vite_rsc_import_env_end__'.length,
            ),
          )

          const targetFileName = `${entryName}.js`
          const importPath = normalizeRelativePath(
            path.relative(
              path.join(
                config.environments[fromEnv!]!.build.outDir,
                chunk.fileName,
                '..',
              ),
              path.join(
                config.environments[toEnv!]!.build.outDir,
                targetFileName,
              ),
            ),
          )

          const replacement = `(import(${JSON.stringify(importPath)}))`
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
