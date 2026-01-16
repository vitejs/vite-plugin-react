# Plan: `import.meta.viteRsc.import()` Implementation

## Overview

Implement `import.meta.viteRsc.import(specifier, { environment })` as a more ergonomic alternative to `import.meta.viteRsc.loadModule(environmentName, entryName)`.

### API Comparison

**Current (loadModule):**

```ts
const ssrModule = await import.meta.viteRsc.loadModule<
  typeof import('./entry.ssr.tsx')
>('ssr', 'index')
```

**New (import):**

```ts
const ssrModule = await import.meta.viteRsc.import<
  typeof import('./entry.ssr.tsx')
>('./entry.ssr', { environment: 'ssr' })
```

### Key Differences

1. Takes module specifier (relative path) instead of entry name
2. Environment is passed via options object
3. Better DX: specifier matches the `typeof import(...)` type annotation

## Implementation

File: `packages/plugin-rsc/src/plugins/import-environment.ts` (exists, needs completion)

Current state: draft copy of `loadModule` logic, missing imports and proper parameterization.

### Plugin Structure

```ts
import assert from 'node:assert'
import path from 'node:path'
import MagicString from 'magic-string'
import { stripLiteral } from 'strip-literal'
import type { Plugin, ViteDevServer, ResolvedConfig } from 'vite'
import { evalValue, normalizeRelativePath } from './utils'

interface PluginManager {
  server: ViteDevServer
  config: ResolvedConfig
}

export function vitePluginImportEnvironment(manager: PluginManager): Plugin {
  return {
    name: 'rsc:import-environment',
    async transform(code, id) {
      if (!code.includes('import.meta.viteRsc.import')) return
      // ... implementation
    },
    renderChunk(code, chunk) {
      if (!code.includes('__vite_rsc_import__')) return
      // ... implementation
    },
  }
}
```

### Transform Logic

Pattern: `import.meta.viteRsc.import('./entry.ssr', { environment: 'ssr' })`

```ts
for (const match of stripLiteral(code).matchAll(
  /import\.meta\.viteRsc\.import\(([\s\S]*?)\)/dg
)) {
  const argCode = code.slice(...match.indices![1]!).trim()
  // Parse: "('./entry.ssr', { environment: 'ssr' })"
  const [specifier, { environment: environmentName }] = evalValue(`[${argCode}]`)

  // Resolve specifier relative to importer
  const targetEnv = manager.server.environments[environmentName]
  const resolved = await targetEnv.pluginContainer.resolveId(specifier, id)

  if (this.environment.mode === 'dev') {
    replacement = `globalThis.__VITE_ENVIRONMENT_RUNNER_IMPORT__(${JSON.stringify(environmentName)}, ${JSON.stringify(resolved.id)})`
  } else {
    // Build: find entry name from resolved ID
    const entryName = findEntryName(targetEnv.config, resolved.id)
    replacement = `"__vite_rsc_import__:${JSON.stringify({...})}__"`
  }
}
```

### Auto-Discovery Pattern (like "use client")

Similar to how `clientReferenceMetaMap` tracks "use client" modules that become client build entries.

**Manager tracking:**

```ts
// In RscPluginManager
environmentImportMetaMap: Record<string, EnvironmentImportMeta> = {}

type EnvironmentImportMeta = {
  resolvedId: string // Absolute path of target module
  targetEnv: string // e.g., 'ssr'
  sourceEnv: string // e.g., 'rsc'
  specifier: string // Original specifier for display
  entryName: string // Derived entry name for output
}
```

**Discovery during transform:**

```ts
// In rsc environment, when we see:
// import.meta.viteRsc.import('./entry.ssr', { environment: 'ssr' })

const resolved = await targetEnv.pluginContainer.resolveId(specifier, importer)
const entryName = deriveEntryName(specifier) // e.g., 'entry.ssr' from './entry.ssr.tsx'

manager.environmentImportMetaMap[resolved.id] = {
  resolvedId: resolved.id,
  targetEnv: environmentName,
  sourceEnv: this.environment.name,
  specifier,
  entryName,
}
```

**Build phase - virtual entry:**
Similar to `virtual:vite-rsc/client-references`, create a virtual module that re-exports discovered entries:

```ts
// virtual:vite-rsc/env-imports/{targetEnv}
// Loaded during target environment build

load(id) {
  if (id === '\0virtual:vite-rsc/env-imports/ssr') {
    const entries = Object.values(manager.environmentImportMetaMap)
      .filter(m => m.targetEnv === 'ssr')

    let code = ''
    for (const meta of entries) {
      // Export each entry module
      code += `export * as ${meta.entryName} from ${JSON.stringify(meta.resolvedId)};\n`
    }
    return code
  }
}
```

Or simpler: just ensure the entries are in `rollupOptions.input`:

```ts
// During buildStart of target environment
buildStart() {
  if (this.environment.name === 'ssr') {
    const entries = Object.values(manager.environmentImportMetaMap)
      .filter(m => m.targetEnv === 'ssr')
    for (const meta of entries) {
      // Add to input dynamically? Or use emitFile?
    }
  }
}
```

**Simplest approach:** Use `this.emitFile` in target environment build:

```ts
// In target environment (ssr) buildStart
for (const meta of discoveredEntries) {
  this.emitFile({
    type: 'chunk',
    id: meta.resolvedId,
    name: meta.entryName,
  })
}
```

### renderChunk Logic

```ts
for (const match of code.matchAll(
  /["']__vite_rsc_import__:([\s\S]*?)__["']/dg,
)) {
  const { fromEnv, toEnv, entryName } = JSON.parse(match[1])
  // Look up actual output filename from emitted chunks
  const targetFileName = `${entryName}.js` // or lookup from manifest
  const importPath = normalizeRelativePath(
    path.relative(
      path.join(
        config.environments[fromEnv].build.outDir,
        chunk.fileName,
        '..',
      ),
      path.join(config.environments[toEnv].build.outDir, targetFileName),
    ),
  )
  s.overwrite(start, end, `(import(${JSON.stringify(importPath)}))`)
}
```

## Build Pipeline Integration

Per `docs/architecture.md`, the build order is:

```
rsc (scan) → ssr (scan) → rsc (real) → client → ssr (real)
```

Integration points:

1. **RSC scan** - discovers `import.meta.viteRsc.import` calls, populates `environmentImportMetaMap`
2. **SSR scan** - can already use discovered entries (SSR scan runs after RSC scan)
3. **RSC real** - transform rewrites to marker with entry names
4. **SSR real** - emits discovered entries via `this.emitFile` in `buildStart`
5. **renderChunk** - resolves markers to relative import paths

Similar to `clientReferenceMetaMap` pattern:

- Scan phase populates the map
- Real build phases use the map to generate code/entries

## Side Note: Future API Considerations

This API is a stopgap until Vite supports plugin API for import attributes (`import("...", { with: { ... } })`).

**Current:**

```ts
import.meta.viteRsc.import('./entry.ssr', { environment: 'ssr' })
```

**Future (when Vite supports):**

```ts
import('./entry.ssr', { with: { environment: 'ssr' } })
```

**Asset loading extension:** If we later want to replace `loadBootstrapScriptContent` with a similar pattern, we could use a separate method to avoid overloading:

```ts
import.meta.viteRsc.import('./entry.ssr', { environment: 'ssr' }) // returns module
import.meta.viteRsc.importAsset('./entry.browser', { asset: 'client' }) // returns string
```

This avoids breaking changes and keeps each method's return type clear.

## Manifest-Based Approach (Preferred)

The initial implementation hardcoded output filenames (`${entryName}.js`), which breaks with custom `entryFileNames` config. A manifest approach solves this.

### Problem with Hardcoded Filenames

```ts
// renderChunk - current implementation
const targetFileName = `${entryName}.js` // ❌ Breaks with custom entryFileNames
```

Build order means RSC builds before SSR:

```
rsc (real) → client → ssr (real)
     ↑                    ↑
     RSC renderChunk      SSR output filenames known
```

### Solution: Manifest with Static Imports

Generate a manifest file with **static import functions** that bundlers can analyze:

```ts
// __vite_rsc_env_imports_manifest.js (generated in buildApp after SSR build)
export default {
  '/abs/path/to/entry.ssr.tsx': () => import('../ssr/entry.ssr.js'),
}
```

Transform emits manifest lookup:

```ts
// Original:
await import.meta.viteRsc
  .import('./entry.ssr', { environment: 'ssr' })
  (
    // Build transform to:
    await import('./__vite_rsc_env_imports_manifest.js'),
  )
  .default['/abs/path/to/entry.ssr.tsx']()
```

### Why Static Import Functions?

Dynamic imports like `import(manifest['key'])` break post-bundling and static analysis. By using functions with static import strings, bundlers can:

- Analyze the dependency graph
- Apply optimizations (tree-shaking, code-splitting)
- Work correctly with further bundling

### Implementation Changes

**1. Transform (in RSC):**

- Dev: unchanged (`globalThis.__VITE_ENVIRONMENT_RUNNER_IMPORT__`)
- Build: emit manifest lookup instead of markers

```ts
// Build mode transform
const manifestImport = `await import('./__vite_rsc_env_imports_manifest.js')`
replacement = `(${manifestImport}).default[${JSON.stringify(resolvedId)}]()`
```

**2. Remove renderChunk:**

- No longer needed for this feature (markers eliminated)

**3. SSR generateBundle:**

- Track output filenames for discovered entries

```ts
generateBundle(options, bundle) {
  for (const [fileName, chunk] of Object.entries(bundle)) {
    if (chunk.type === 'chunk' && chunk.isEntry) {
      const resolvedId = chunk.facadeModuleId
      if (resolvedId && resolvedId in manager.environmentImportMetaMap) {
        manager.environmentImportOutputMap[resolvedId] = fileName
      }
    }
  }
}
```

**4. buildApp - writeEnvironmentImportsManifest:**

- Generate manifest after SSR build completes
- Calculate relative paths from manifest location to target chunks

```ts
function writeEnvironmentImportsManifest() {
  const rscOutDir = config.environments.rsc.build.outDir
  const manifestPath = path.join(
    rscOutDir,
    '__vite_rsc_env_imports_manifest.js',
  )

  let code = 'export default {\n'
  for (const [resolvedId, meta] of Object.entries(
    manager.environmentImportMetaMap,
  )) {
    const outputFileName = manager.environmentImportOutputMap[resolvedId]
    const targetOutDir = config.environments[meta.targetEnv].build.outDir
    const relativePath = normalizeRelativePath(
      path.relative(rscOutDir, path.join(targetOutDir, outputFileName)),
    )
    code += `  ${JSON.stringify(resolvedId)}: () => import(${JSON.stringify(relativePath)}),\n`
  }
  code += '}\n'

  fs.writeFileSync(manifestPath, code)
}
```

### Bidirectional Support

Both directions are supported:

- **RSC → SSR**: `import('./entry.ssr', { environment: 'ssr' })` in RSC code
- **SSR → RSC**: `import('./entry.rsc', { environment: 'rsc' })` in SSR code

This is similar to "use client" / "use server" discovery - each scan phase can discover entries for other environments.

**Key insight**: Entry injection must happen AFTER both scan phases but BEFORE real builds.

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ RSC Scan                                                                │
│   transform: discover viteRsc.import → populate environmentImportMetaMap│
│   (discovers RSC → SSR imports)                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ SSR Scan                                                                │
│   transform: discover viteRsc.import → populate environmentImportMetaMap│
│   (discovers SSR → RSC imports)                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ Inject Discovered Entries (in buildApp, after both scans)               │
│   for each meta in environmentImportMetaMap:                            │
│     inject meta.resolvedId into target environment's rollupOptions.input│
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ RSC Real Build                                                          │
│   transform: emit manifest lookup code                                  │
│   generateBundle: track resolvedId → outputFileName (for SSR → RSC)     │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ Client Build                                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ SSR Real Build                                                          │
│   transform: emit manifest lookup code                                  │
│   generateBundle: track resolvedId → outputFileName (for RSC → SSR)     │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ buildApp Post-Build                                                     │
│   writeEnvironmentImportsManifest:                                      │
│     - Write manifest to RSC output (for RSC → SSR imports)              │
│     - Write manifest to SSR output (for SSR → RSC imports)              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Manifest Per Source Environment

Each source environment gets its own manifest with imports pointing to target environments:

```ts
// dist/rsc/__vite_rsc_env_imports_manifest.js (for RSC → SSR)
export default {
  '/abs/path/entry.ssr.tsx': () => import('../ssr/entry.ssr.js'),
}

// dist/ssr/__vite_rsc_env_imports_manifest.js (for SSR → RSC)
export default {
  '/abs/path/entry.rsc.tsx': () => import('../rsc/index.js'),
}
```

## Implementation Steps

1. [x] Add `environmentImportMetaMap` to RscPluginManager
2. [x] Clean up `import-environment.ts`: add imports, parameterize with manager
3. [x] Implement transform to discover and track imports
4. [x] Inject discovered entries into target environment's input
5. [ ] **Fix**: Move entry injection to AFTER both scans (currently after RSC scan only)
6. [ ] Update transform to emit manifest lookup (build mode)
7. [ ] Remove renderChunk marker replacement
8. [ ] Add `environmentImportOutputMap` to track resolvedId → outputFileName
9. [ ] Add generateBundle hook to populate output map (in both RSC and SSR)
10. [ ] Add `writeEnvironmentImportsManifest` in buildApp (per source environment)
11. [ ] Test with basic example (RSC → SSR)
12. [ ] Test bidirectional (SSR → RSC) if applicable
13. [ ] Update documentation
