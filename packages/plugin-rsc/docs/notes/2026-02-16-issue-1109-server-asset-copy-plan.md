# Issue #1109 - Safer RSC server-asset copying

## Problem statement

`@vitejs/plugin-rsc` currently copies almost every emitted asset from the `rsc` build into the `client` build (`packages/plugin-rsc/src/plugin.ts`, around `generateBundle`).

That behavior is convenient, but unsafe as a default:

- it can expose server-only assets produced by framework/user plugins via `emitFile({ type: "asset" })`
- it relies on a coarse heuristic (`copyServerAssetsToClient ?? (() => true)`)
- it already needs special-case exclusions (`.vite/manifest.json`), which is a smell

## Implementation status

Implemented on 2026-02-16.

- Added `collectPublicServerAssets(bundle)` in `packages/plugin-rsc/src/plugin.ts`.
- Updated `generateBundle` copy logic to use that set as the default filter.
- `copyServerAssetsToClient` is now deprecated and treated as a no-op.
- Updated `packages/plugin-rsc/examples/basic/vite.config.ts` to stop relying on option filtering for `__server_secret.txt`, so default behavior covers the security case.

## What we should copy by default

Copy only assets that are clearly public-by-construction from RSC code:

1. side-effect CSS used by server components
2. `?url` (and similar Vite asset URL) imports that flow into rendered markup
3. transitive assets referenced by those assets (via chunk metadata, e.g. fonts/images from copied CSS)

Do **not** copy arbitrary emitted assets that are not referenced from RSC chunk metadata.

## Concrete implementation idea

### 1) Add an explicit "public server assets" collector

Introduce a helper in `packages/plugin-rsc/src/plugin.ts` (next to `collectAssetDeps*`) that traverses the `rsc` output bundle and returns a `Set<string>` of asset file names to copy.

Suggested logic:

- Walk all output chunks in the RSC bundle.
- Collect roots from `chunk.viteMetadata`:
  - `importedCss`
  - `importedAssets`
- (original idea) recursively walk collected assets via `asset.viteMetadata`
- (updated implementation) rely only on chunk metadata (`chunk.viteMetadata.importedCss/importedAssets`) for cross-version consistency

This follows Vite's own metadata contract (verified in `~/code/others/vite`):

- `packages/vite/types/metadata.d.ts` defines `importedCss` and `importedAssets` on chunks/assets
- Vite plugins populate these sets in asset/css transforms

### 2) Change default copy behavior in `generateBundle`

Current:

- iterate all RSC assets and copy when `filterAssets(fileName)` passes

Proposed:

- compute `defaultPublicAssets = collectPublicServerAssets(manager.bundles['rsc']!)`
- default predicate is now `fileName => defaultPublicAssets.has(fileName)`
- keep manifest exclusion guard (or make collector naturally exclude it)

So the existing option remains backward-compatible as an escape hatch, but default becomes safe.

### 3) Keep / slightly reshape `copyServerAssetsToClient`

Minimal-change path:

- keep current signature `(fileName: string) => boolean`
- keep it as an override filter (if provided, it replaces default filter behavior)

Cleaner composable path (future follow-up):

- extend option context to include why an asset is selected
  - e.g. `{ fileName, reason: 'chunk:importedCss' | 'chunk:importedAssets' }`
- this lets frameworks opt-in extra categories intentionally without reimplementing internals

## Why this addresses #1109

- server-only `emitFile` assets are no longer copied unless they are referenced by public RSC asset metadata
- intended public assets (CSS and `?url`) continue to work
- behavior aligns with issue intent: secure default + explicit opt-in for non-standard cases

## Expected compatibility impact

- Potentially breaking for setups that relied on accidental copying of unreferenced server assets.
- This is acceptable for security-hardening behavior, but should be called out in changelog.
- For migration, users can temporarily use `copyServerAssetsToClient` to opt back in selectively.

## Test plan

Add/adjust e2e checks in `packages/plugin-rsc/examples/basic` tests:

1. **Security baseline**: emitted `__server_secret.txt` from RSC is present in RSC output and absent in client output by default.
2. **RSC CSS**: CSS imported in server component is available in client output and links resolve.
3. **RSC `?url`**: `import x from './foo.css?url'` (or image/font) from server component resolves to an existing client asset.
4. **Transitive CSS assets**: font/image referenced from copied CSS is also copied.
5. **Override path**: `copyServerAssetsToClient` can explicitly allow an otherwise skipped asset.

## Optional follow-up (if we want Astro-like ergonomics)

Add a dedicated API for intentional server->client asset emission (conceptually similar to Astro's `emitClientAsset`).

This is not required for the initial fix, but could improve composability for framework authors that legitimately need to publish custom artifacts.

## Follow-up design: deprecate `copyServerAssetsToClient`, add experimental explicit API

### Prior art from Astro (`~/code/others/astro`)

Astro recently introduced `emitClientAsset` and uses it as an explicit opt-in path for SSR->client asset movement:

- `packages/astro/src/assets/utils/assets.ts`
  - `emitClientAsset(pluginContext, options)` calls `emitFile(options)` and tracks the returned handle.
  - tracking is per-environment via `WeakMap<Environment, Set<string>>`.
- `packages/astro/src/core/build/vite-plugin-ssr-assets.ts`
  - `buildStart`: reset handle tracking for current env.
  - `generateBundle`: resolve tracked handles to output filenames via `this.getFileName(handle)`.
  - `writeBundle`: merge in manifest-derived CSS/assets as always-public assets.
- `packages/integrations/markdoc/src/content-entry-type.ts`
  - integration authors call `emitClientAsset(...)` only during build mode.

This pattern maps well to RSC needs: explicit emit intent + deferred handle->filename resolution in bundling phase.

### Proposed API shape for `@vitejs/plugin-rsc`

Introduce an experimental helper export:

```ts
// e.g. @vitejs/plugin-rsc/assets (or root export behind `experimental` namespace)
export function emitClientAsset(
  pluginContext: Rollup.PluginContext,
  options: Parameters<Rollup.PluginContext['emitFile']>[0],
): string
```

Recommended runtime constraints:

- allow only `options.type === "asset"` for v1 (throw otherwise)
- require build mode (`!pluginContext.meta.watchMode`) for now
- only collect when `pluginContext.environment.name === "rsc"`

### Internal implementation idea in plugin-rsc

1. Track explicit handles on the manager

- Add `clientAssetHandlesByEnv: WeakMap<vite.Environment, Set<string>>` (or `Map<string, Set<string>>` keyed by env name) in shared state.
- Expose internal helpers:
  - `trackClientAssetHandle(environment, handle)`
  - `resetClientAssetHandles(environment)`
  - `resolveClientAssetFileNames(environment, pluginContext)`

2. Lifecycle integration

- `buildStart` (for each build env): reset handle set.
- `generateBundle` (for each env): resolve tracked handles with `this.getFileName(handle)` and store resolved filenames in manager, e.g. `explicitClientAssetsByEnv[envName]`.

3. Merge with current default copy policy

- In client `generateBundle`, compute candidate copy set as:
  - `collectPublicServerAssets(rscBundle)` (current safe default)
  - union `explicitClientAssetsByEnv.rsc` (new explicit opt-in assets)
- copy only this union by default.

This gives a secure default while still supporting framework-specific artifacts intentionally emitted from RSC.

### Deprecation plan for `copyServerAssetsToClient`

Phase 1 (next minor):

- keep option working, but mark `@deprecated` in type docs and README.
- warn once at runtime when option is used:
  - "`copyServerAssetsToClient` is deprecated; prefer experimental `emitClientAsset` for explicit opt-in assets."
- behavior unchanged for compatibility.

Phase 2 (future major):

- remove option and rely on:
  - safe metadata-based default
  - explicit `emitClientAsset` for non-standard assets

### Migration story

- Before: framework/plugin used `copyServerAssetsToClient` to allow/deny by filename pattern.
- After: framework/plugin emits only intended public artifacts via `emitClientAsset(this, { type: "asset", ... })` from `rsc` environment.
- No change needed for normal CSS and `?url` imports; those continue to work via metadata collector.

### Additional tests for this follow-up

1. `emitClientAsset` from `rsc` causes asset to appear in client output.
2. plain `emitFile({ type: "asset" })` from `rsc` is not copied by default.
3. `copyServerAssetsToClient` emits deprecation warning (once).
4. `emitClientAsset` rejects non-asset emission in v1.

## Action item: follow up with Vite core

- Verify the stability/contract of `viteMetadata` on both chunks and assets across supported Vite backends/versions.
- Ask whether asset-level metadata (`OutputAsset.viteMetadata`) is intended as public plugin API, or implementation detail.
- If needed, propose a typing/docs improvement in Vite core so plugin authors can rely on this behavior safely.
- Defer proposing an opt-in per-`emitFile` public-tag API for now, unless concrete ecosystem demand appears.

### Vite 7 vs Vite 8 inconsistency notes

Current workspace uses Vite 7 (`node_modules/vite/package.json` shows `7.3.1`), while local Vite main checkout is Vite 8 beta.

- Vite 7 type surface (installed package):
  - `node_modules/vite/types/metadata.d.ts` only exposes `ChunkMetadata` and augments `rollup.RenderedChunk` with `viteMetadata`.
  - No `AssetMetadata` type and no `rollup.OutputAsset.viteMetadata` augmentation in that file.
- Vite 8 type surface (local Vite repo):
  - `~/code/others/vite/packages/vite/types/metadata.d.ts` defines both `AssetMetadata` and `ChunkMetadata`.
  - It augments `rolldown.OutputAsset` (plus chunk types) with `viteMetadata`.
- Practical effect for plugin authors:
  - On Vite 7, reading `output.viteMetadata` on assets is a type error unless narrowed/cast.
  - On Vite 8+ (rolldown typing), asset metadata access is typed.
- Runtime ambiguity:
  - Vite 7 runtime code does optional reads like `asset.viteMetadata?.importedAssets` in manifest generation (`node_modules/vite/dist/node/chunks/config.js`), but type declarations do not guarantee this.
  - This creates a "runtime might have it, types may not" gap for downstream plugins.

Recommendation when following up in Vite core:

- clarify intended contract per major/version and backend (`rollup` vs `rolldown` typing)
- either document asset `viteMetadata` as supported API in Vite 8+ only, or provide cross-version guidance/fallback expectations
