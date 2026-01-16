# RSC Plugin Architecture

## Overview

The `@vitejs/plugin-rsc` implements React Server Components using Vite's multi-environment architecture. Each environment (rsc, ssr, client) has its own module graph, requiring a multi-pass build strategy.

## Build Pipeline

### With SSR (5-step)

```
rsc (scan) → ssr (scan) → rsc (real) → client → ssr (real)
```

| Step | Phase    | Write to Disk | Purpose                                                                      |
| ---- | -------- | ------------- | ---------------------------------------------------------------------------- |
| 1    | RSC scan | No            | Discover `"use client"` boundaries → `clientReferenceMetaMap`                |
| 2    | SSR scan | No            | Discover `"use server"` boundaries → `serverReferenceMetaMap`                |
| 3    | RSC real | Yes           | Build server components, populate `renderedExports`, `serverChunk`           |
| 4    | Client   | Yes           | Build client bundle using reference metadata, generate `buildAssetsManifest` |
| 5    | SSR real | Yes           | Final SSR build with complete manifests                                      |

### Without SSR (4-step)

```
rsc (scan) → client (scan) → rsc (real) → client (real)
```

## Why This Build Order?

1. **RSC scan first**: Must discover `"use client"` boundaries before client build knows what to bundle
2. **SSR scan second**: Must discover `"use server"` boundaries for proxy generation in both client and SSR
3. **RSC real third**: Generates proxy modules, determines which exports are actually used (`renderedExports`)
4. **Client fourth**: Needs RSC's `renderedExports` to tree-shake unused client components
5. **SSR last**: Needs complete client manifest for SSR hydration

### Critical Dependency: RSC → SSR Scan

The SSR scan **depends on RSC scan output**. This prevents parallelization:

1. SSR entry imports `@vitejs/plugin-rsc/ssr`
2. `ssr.tsx` imports `virtual:vite-rsc/client-references`
3. This virtual module reads `clientReferenceMetaMap` (populated during RSC scan)
4. Client components may import `"use server"` files
5. SSR scan processes those imports, populating `serverReferenceMetaMap`

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     RSC Scan Build                          │
│  Writes: clientReferenceMetaMap (importId, exportNames)     │
│  Writes: serverReferenceMetaMap (for "use server" in RSC)   │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     SSR Scan Build                          │
│  Writes: serverReferenceMetaMap (for "use server" in SSR)   │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     RSC Real Build                          │
│  Reads: clientReferenceMetaMap                              │
│  Mutates: renderedExports, serverChunk on each meta         │
│  Outputs: rscBundle                                         │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
                    manager.stabilize()
                    (sorts clientReferenceMetaMap)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Client Build                             │
│  Reads: clientReferenceMetaMap (with renderedExports)       │
│  Uses: clientReferenceGroups for chunking                   │
│  Outputs: buildAssetsManifest, copies RSC assets            │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     SSR Real Build                          │
│  Reads: serverReferenceMetaMap                              │
│  Final output with assets manifest                          │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### RscPluginManager

Central state manager shared across all build phases:

```typescript
class RscPluginManager {
  server: ViteDevServer
  config: ResolvedConfig
  rscBundle: Rollup.OutputBundle
  buildAssetsManifest: AssetsManifest | undefined
  isScanBuild: boolean = false

  // Reference tracking
  clientReferenceMetaMap: Record<string, ClientReferenceMeta> = {}
  clientReferenceGroups: Record<string, ClientReferenceMeta[]> = {}
  serverReferenceMetaMap: Record<string, ServerReferenceMeta> = {}
  serverResourcesMetaMap: Record<string, { key: string }> = {}
}
```

### Client Reference Discovery

When RSC transform encounters `"use client"`:

1. Parse exports from the module
2. Generate a unique `referenceKey` (hash of module ID)
3. Store in `clientReferenceMetaMap`:
   - `importId`: Module ID for importing
   - `referenceKey`: Unique identifier
   - `exportNames`: List of exports
   - `renderedExports`: Exports actually used (populated during real build)
   - `serverChunk`: Which RSC chunk imports this (for grouping)

### Server Reference Discovery

When transform encounters `"use server"`:

1. Parse exported functions
2. Generate reference IDs
3. Store in `serverReferenceMetaMap`
4. Generate proxy module that calls server via RPC

### Virtual Modules

Key virtual modules used in the build:

| Virtual Module                                    | Purpose                                         |
| ------------------------------------------------- | ----------------------------------------------- |
| `virtual:vite-rsc/client-references`              | Entry point importing all client components     |
| `virtual:vite-rsc/client-references/group/{name}` | Grouped client components for code splitting    |
| `virtual:vite-rsc/assets-manifest`                | Client asset manifest for SSR                   |
| `virtual:vite-rsc/rpc-client`                     | Dev-mode RPC client for cross-environment calls |

### Cross-Environment Module Loading

`import.meta.viteRsc.loadModule(environment, entryName)` enables loading modules from other environments:

**Dev mode:**

```typescript
globalThis.__VITE_ENVIRONMENT_RUNNER_IMPORT__(environmentName, resolvedId)
```

**Build mode:**

- Emits marker during transform
- `renderChunk` resolves to relative import path between output directories

## Key Code Locations

| Component                     | Location                   |
| ----------------------------- | -------------------------- |
| Manager definition            | `src/plugin.ts:112-148`    |
| Build orchestration           | `src/plugin.ts:343-429`    |
| clientReferenceMetaMap writes | `src/plugin.ts:1386`       |
| serverReferenceMetaMap writes | `src/plugin.ts:1817, 1862` |
| Scan strip plugin             | `src/plugins/scan.ts`      |
| Cross-env module loading      | `src/plugin.ts:824-916`    |

## Virtual Module Resolution

Virtual modules with `\0` prefix need special handling:

1. Vite convention: `\0` prefix marks virtual modules
2. When used as import specifiers, `\0` must be stripped
3. CSS requests get `?direct` query added by Vite
4. The `resolved-id-proxy` plugin handles query stripping

See `src/plugins/resolved-id-proxy.ts` for implementation.
