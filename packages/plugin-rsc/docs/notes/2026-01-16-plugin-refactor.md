# Refactor: Split plugin.ts (~2520 lines)

## Problem

`packages/plugin-rsc/src/plugin.ts` is too large (~25k tokens) to fit in context.

## Current Structure

### Named functions (already defined but inline)

| Function                        | Lines     | Size       |
| ------------------------------- | --------- | ---------- |
| `vitePluginUseClient`           | 1320-1647 | ~330 lines |
| `vitePluginRscCss`              | 2125-2520 | ~400 lines |
| `vitePluginUseServer`           | 1803-1940 | ~140 lines |
| `vitePluginDefineEncryptionKey` | 1736-1800 | ~65 lines  |
| `customOptimizerMetadataPlugin` | 1647-1736 | ~90 lines  |
| `globalAsyncLocalStoragePlugin` | 1292-1318 | ~25 lines  |
| Asset utils                     | 1995-2120 | ~130 lines |

### Inline plugins in `vitePluginRsc` return array (405-1287)

| Plugin name                        | Lines     | Size       |
| ---------------------------------- | --------- | ---------- |
| config/environments/buildApp       | 500-629   | ~130 lines |
| configureServer/hotUpdate          | 645-862   | ~220 lines |
| react-server-dom-webpack-alias     | 864-886   | ~25 lines  |
| load-environment-module            | 887-981   | ~100 lines |
| load-module-dev-proxy + rpc-client | 982-1059  | ~80 lines  |
| assets-manifest                    | 1060-1173 | ~115 lines |
| bootstrap-script-content           | 1174-1275 | ~100 lines |

## Extraction Plan

### Phase 1: Extract largest named functions (~730 lines)

1. `plugins/use-client.ts` - `vitePluginUseClient` (~330 lines)
2. `plugins/rsc-css.ts` - `vitePluginRscCss` + `transformRscCssExport` + CSS utils (~400 lines)

### Phase 2: Extract remaining named functions (~320 lines)

3. `plugins/use-server.ts` - `vitePluginUseServer` (~140 lines)
4. `plugins/assets.ts` - `assetsURL`, `assetsURLOfDeps`, `mergeAssetDeps`, `collectAssetDeps`, `collectAssetDepsInner`, `RuntimeAsset`, `serializeValueWithRuntime` (~130 lines)
5. `plugins/encryption.ts` - `vitePluginDefineEncryptionKey` (~65 lines)

### Phase 3: Extract inline plugins (~550 lines)

6. `plugins/hmr.ts` - configureServer, configurePreviewServer, hotUpdate (~220 lines)
7. `plugins/assets-manifest.ts` - virtual:vite-rsc/assets-manifest plugin (~115 lines)
8. `plugins/load-module.ts` - load-environment-module + dev-proxy + rpc-client (~180 lines)
9. `plugins/bootstrap.ts` - bootstrap-script-content plugins (~100 lines)

### Phase 4: Consider further splits

10. `plugins/config.ts` - environment config generation (~130 lines)
11. Move `RscPluginManager` class to `manager.ts`

## Dependencies to Watch

- Most plugins need `manager: RscPluginManager`
- Some plugins need `rscPluginOptions`
- `vitePluginUseClient` needs `customOptimizerMetadataPlugin` (extract together or keep dep)
- Asset utils used by assets-manifest plugin

## Target Structure

```
src/
  plugin.ts           (~500 lines - main exports, manager, buildApp orchestration)
  plugins/
    use-client.ts     (~330 lines)
    use-server.ts     (~140 lines)
    rsc-css.ts        (~400 lines)
    assets.ts         (~130 lines)
    assets-manifest.ts(~115 lines)
    hmr.ts            (~220 lines)
    load-module.ts    (~180 lines)
    bootstrap.ts      (~100 lines)
    encryption.ts     (~65 lines)
    ... (existing files)
```

## Estimated Reduction

- Phase 1: ~730 lines (29%)
- Phase 2: ~320 lines (13%)
- Phase 3: ~550 lines (22%)
- Total: ~1600 lines (64%), leaving ~900 lines in plugin.ts
