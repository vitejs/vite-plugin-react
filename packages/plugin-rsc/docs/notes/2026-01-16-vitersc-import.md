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

## Implementation Steps

1. [ ] Add `environmentImportMetaMap` to RscPluginManager
2. [ ] Clean up `import.ts`: add imports, parameterize with manager
3. [ ] Implement transform to discover and track imports
4. [ ] Add `buildStart` hook to emit discovered entries in target environment
5. [ ] Implement renderChunk to resolve markers
6. [ ] Test with basic example
7. [ ] Update documentation
