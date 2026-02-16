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
- Kept `copyServerAssetsToClient` as an explicit override (same signature/behavior).
- Updated `packages/plugin-rsc/examples/basic/vite.config.ts` to stop relying on option filtering for `__server_secret.txt`, so default behavior covers the security case.

## What we should copy by default

Copy only assets that are clearly public-by-construction from RSC code:

1. side-effect CSS used by server components
2. `?url` (and similar Vite asset URL) imports that flow into rendered markup
3. transitive assets referenced by those assets (e.g. fonts/images from copied CSS)

Do **not** copy arbitrary emitted assets that are not referenced from RSC chunk metadata.

## Concrete implementation idea

### 1) Add an explicit "public server assets" collector

Introduce a helper in `packages/plugin-rsc/src/plugin.ts` (next to `collectAssetDeps*`) that traverses the `rsc` output bundle and returns a `Set<string>` of asset file names to copy.

Suggested logic:

- Walk all output chunks in the RSC bundle.
- Collect roots from `chunk.viteMetadata`:
  - `importedCss`
  - `importedAssets`
- Recursively walk collected assets:
  - for each asset, read `bundle[fileName]`
  - if `asset.viteMetadata?.importedAssets` exists, add and recurse
  - (optional) also recurse into `asset.viteMetadata?.importedCss` for completeness

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
  - e.g. `{ fileName, reason: 'chunk:importedCss' | 'chunk:importedAssets' | 'asset:transitive' }`
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
