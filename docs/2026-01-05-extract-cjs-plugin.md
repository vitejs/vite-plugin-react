# Extract CJS Plugin to Dedicated Package

## Overview

Extract `cjsModuleRunnerPlugin` from `packages/plugin-rsc` into a new standalone package `@hiogawa/vite-plugin-cjs` in a dedicated repository.

## Files to Extract

| Source File             | Contents                                                     |
| ----------------------- | ------------------------------------------------------------ |
| `src/plugins/cjs.ts`    | Main plugin `cjsModuleRunnerPlugin()`, `extractPackageKey()` |
| `src/transforms/cjs.ts` | Transform logic `transformCjsToEsm()`                        |
| `src/plugins/shared.ts` | Only `parseIdQuery()` function (~11 lines)                   |

## New Package Structure

```
@hiogawa/vite-plugin-cjs/
├── src/
│   ├── index.ts          # Re-export plugin from plugin.ts
│   ├── plugin.ts         # Main plugin (from plugins/cjs.ts)
│   ├── transform.ts      # Transform logic (from transforms/cjs.ts)
│   └── utils.ts          # parseIdQuery helper
├── package.json
├── tsconfig.json
└── tsdown.config.ts
```

## Dependencies

**package.json:**

```json
{
  "name": "@hiogawa/vite-plugin-cjs",
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "files": ["dist"],
  "peerDependencies": {
    "vite": "*"
  },
  "dependencies": {
    "@hiogawa/utils": "^1.7.0",
    "es-module-lexer": "^2.0.0",
    "estree-walker": "^3.0.3",
    "magic-string": "^0.30.21",
    "periscopic": "^4.0.2",
    "vitefu": "^1.1.1"
  }
}
```

## Changes to plugin-rsc

1. Add dependency: `"@hiogawa/vite-plugin-cjs": "^0.1.0"`

2. Update `src/plugins/cjs.ts` to re-export:

   ```ts
   export { cjsModuleRunnerPlugin } from '@hiogawa/vite-plugin-cjs'
   ```

3. Remove `src/transforms/cjs.ts` (no longer needed)

4. Remove `parseIdQuery` from `src/plugins/shared.ts` if unused elsewhere

## Implementation Steps

### Phase 1: Create new repo

1. Create new repo `vite-plugin-cjs`
2. Initialize with package.json, tsconfig.json, tsdown config
3. Copy and adapt source files:
   - `plugin.ts` - update imports
   - `transform.ts` - no changes needed
   - `utils.ts` - just `parseIdQuery`
4. Create `index.ts` entry point
5. Build and test locally

### Phase 2: Update plugin-rsc

1. Add `@hiogawa/vite-plugin-cjs` as dependency
2. Replace `src/plugins/cjs.ts` with re-export
3. Delete `src/transforms/cjs.ts`
4. Check if `parseIdQuery` is used elsewhere in shared.ts
5. Run tests to verify nothing broke

## Notes

- The transform expects `__vite_ssr_exportAll__` to exist at runtime (provided by Vite's module runner)
- Plugin applies only when `env.config.dev.moduleRunnerTransform` is enabled
