# Changelog

## Unreleased

## 4.5.2 (2025-06-10)

### Suggest `@vitejs/plugin-react-oxc` if rolldown-vite is detected [#491](https://github.com/vitejs/vite-plugin-react/pull/491)

Emit a log which recommends `@vitejs/plugin-react-oxc` when `rolldown-vite` is detected to improve performance and use Oxc under the hood. The warning can be disabled by setting `disableOxcRecommendation: false` in the plugin options.

### Use `optimizeDeps.rollupOptions` instead of `optimizeDeps.esbuildOptions` for rolldown-vite [#489](https://github.com/vitejs/vite-plugin-react/pull/489)

This suppresses the warning about `optimizeDeps.esbuildOptions` being deprecated in rolldown-vite.

### Add Vite 7-beta to peerDependencies range [#497](https://github.com/vitejs/vite-plugin-react/pull/497)

React plugins are compatible with Vite 7, this removes the warning when testing the beta.

## 4.5.1 (2025-06-03)

### Add explicit semicolon in preambleCode [#485](https://github.com/vitejs/vite-plugin-react/pull/485)

This fixes an edge case when using HTML minifiers that strips line breaks aggressively.

## 4.5.0 (2025-05-23)

### Add `filter` for rolldown-vite [#470](https://github.com/vitejs/vite-plugin-react/pull/470)

Added `filter` so that it is more performant when running this plugin with rolldown-powered version of Vite.

### Skip HMR for JSX files with hooks [#480](https://github.com/vitejs/vite-plugin-react/pull/480)

This removes the HMR warning for hooks with JSX.

## 4.4.1 (2025-04-19)

Fix type issue when using `moduleResolution: "node"` in tsconfig [#462](https://github.com/vitejs/vite-plugin-react/pull/462)

## 4.4.0 (2025-04-15)

### Make compatible with rolldown-vite

This plugin is now compatible with rolldown-powered version of Vite.
Note that currently the `__source` property value position might be incorrect. This will be fixed in the near future.

## 4.4.0-beta.2 (2025-04-15)

### Add `reactRefreshHost` option

Add `reactRefreshHost` option to set a React Fast Refresh runtime URL prefix.
This is useful in a module federation context to enable HMR by specifying the host application URL in the Vite config of a remote application.
See full discussion here: https://github.com/module-federation/vite/issues/183#issuecomment-2751825367

```ts
export default defineConfig({
  plugins: [react({ reactRefreshHost: 'http://localhost:3000' })],
})
```

## 4.4.0-beta.1 (2025-04-09)

## 4.4.0-beta.0 (2025-04-09)

## 4.3.4 (2024-11-26)

### Add Vite 6 to peerDependencies range

Vite 6 is highly backward compatible, not much to add!

### Force Babel to output spec compliant import attributes [#386](https://github.com/vitejs/vite-plugin-react/pull/386)

The default was an old spec (`with type: "json"`). We now enforce spec compliant (`with { type: "json" }`)

## 4.3.3 (2024-10-19)

### React Compiler runtimeModule option removed

React Compiler was updated to accept a `target` option and `runtimeModule` was removed. vite-plugin-react will still detect `runtimeModule` for backwards compatibility.

When using a custom `runtimeModule` or `target !== '19'`, the plugin will not try to pre-optimize `react/compiler-runtime` dependency.

The [react-compiler-runtime](https://www.npmjs.com/package/react-compiler-runtime) is now available on npm can be used instead of the local shim for people using the compiler with React < 19.

Here is the configuration to use the compiler with React 18 and correct source maps in development:

```bash
npm install babel-plugin-react-compiler react-compiler-runtime @babel/plugin-transform-react-jsx-development
```

```ts
export default defineConfig(({ command }) => {
  const babelPlugins = [['babel-plugin-react-compiler', { target: '18' }]]
  if (command === 'serve') {
    babelPlugins.push(['@babel/plugin-transform-react-jsx-development', {}])
  }

  return {
    plugins: [react({ babel: { plugins: babelPlugins } })],
  }
})
````

## 4.3.2 (2024-09-29)

Ignore directive sourcemap error [#369](https://github.com/vitejs/vite-plugin-react/issues/369)

## 4.3.1 (2024-06-10)

### Fix support for React Compiler with React 18

The previous version made this assumption that the compiler was only usable with React 19, but it's possible to use it with React 18 and a custom `runtimeModule`: https://gist.github.com/poteto/37c076bf112a07ba39d0e5f0645fec43

When using a custom `runtimeModule`, the plugin will not try to pre-optimize `react/compiler-runtime` dependency.

Reminder: Vite expect code outside of `node_modules` to be ESM, so you will need to update the gist with `import React from 'react'`.

## 4.3.0 (2024-05-22)

### Fix support for React compiler

Don't set `retainLines: true` when the React compiler is used. This creates whitespace issues and the compiler is modifying the JSX too much to get correct line numbers after that. If you want to use the React compiler and get back correct line numbers for tools like [vite-plugin-react-click-to-component](https://github.com/ArnaudBarre/vite-plugin-react-click-to-component) to work, you should update your config to something like:

```ts
export default defineConfig(({ command }) => {
  const babelPlugins = [['babel-plugin-react-compiler', {}]]
  if (command === 'serve') {
    babelPlugins.push(['@babel/plugin-transform-react-jsx-development', {}])
  }

  return {
    plugins: [react({ babel: { plugins: babelPlugins } })],
  }
})
```

### Support HMR for class components

This is a long overdue and should fix some issues people had with HMR when migrating from CRA.

## 4.2.1 (2023-12-04)

Remove generic parameter on `Plugin` to avoid type error with Rollup 4/Vite 5 and `skipLibCheck: false`.

I expect very few people to currently use this feature, but if you are extending the React plugin via `api` object, you can get back the typing of the hook by importing `ViteReactPluginApi`:

```ts
import type { Plugin } from 'vite'
import type { ViteReactPluginApi } from '@vitejs/plugin-react'

export const somePlugin: Plugin = {
  name: 'some-plugin',
  api: {
    reactBabel: (babelConfig) => {
      babelConfig.plugins.push('some-babel-plugin')
    },
  } satisfies ViteReactPluginApi,
}
```

## 4.2.0 (2023-11-16)

### Update peer dependency range to target Vite 5

There were no breaking change that impacted this plugin, so any combination of React plugins and Vite core version will work.

### Align jsx runtime for optimized dependencies

This will only affect people using internal libraries that contains untranspiled JSX. This change aligns the optimizer with the source code and avoid issues when the published source don't have `React` in the scope.

Reminder: While being partially supported in Vite, publishing TS & JSX outside of internal libraries is highly discouraged.

## 4.1.1 (2023-11-02)

- Enable retainLines to get correct line numbers for jsxDev (fix [#235](https://github.com/vitejs/vite-plugin-react/issues/235))

## 4.1.0 (2023-09-24)

- Add `@types/babel__cores` to dependencies (fix [#211](https://github.com/vitejs/vite-plugin-react/issues/211))
- Improve build perf when not using Babel plugins by lazy loading `@babel/core` [#212](https://github.com/vitejs/vite-plugin-react/pull/212)
- Better invalidation message when an export is added & fix HMR for export of nullish values [#215](https://github.com/vitejs/vite-plugin-react/pull/215)
- Include non-dev jsx runtime in optimizeDeps & support HMR for JS files using the non dev runtime [#224](https://github.com/vitejs/vite-plugin-react/pull/224)
- The build output now contains a `index.d.cts` file so you don't get types errors when setting `moduleResolution` to `node16` or `nodenext` in your tsconfig (we recommend using `bundler` which is more close to how Vite works)

## 4.0.4 (2023-07-31)

- Fix [#198](https://github.com/vitejs/vite-plugin-react/discussions/198): Enable Babel if presets list is not empty

## 4.0.3 (2023-07-10)

- Revert [#108](https://github.com/vitejs/vite-plugin-react/pull/108): Remove throw when refresh runtime is loaded twice to enable usage in micro frontend apps. This was added to help fix setup usage, and this is not worth an annoying warning for others or a config parameter.

## 4.0.2 (2023-07-06)

- Fix fast-refresh for files that are transformed into jsx ([#188](https://github.com/vitejs/vite-plugin-react/pull/188))

## 4.0.1 (2023-06-19)

- Support [Vitest deps.experimentalOptimizer](https://vitest.dev/config/#deps-experimentaloptimizer)
- Support using components inside web workers ([#181](https://github.com/vitejs/vite-plugin-react/pull/181))

## 4.0.0 (2023-04-20)

This major version include a revamp of options:

- `include`/`exclude` now allow to completely override the files processed by the plugin ([#122](https://github.com/vitejs/vite-plugin-react/pull/122)). This is more in line with other Rollup/Vite plugins and simplify the setup of enabling Fast Refresh for `.mdx` files. This can be done like this:

```js
export default defineConfig({
  plugins: [
    { enforce: 'pre', ...mdx() },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
  ],
})
```

These changes also allow to apply Babel plugins on files outside Vite root (expect in node_modules), which improve support for monorepo (fix [#16](https://github.com/vitejs/vite-plugin-react/issues/16)).

With these changes, only the file extensions is used for filtering processed files and the query param fallback is removed.

- `fastRefresh` is removed ([#122](https://github.com/vitejs/vite-plugin-react/pull/122)). This should be correctly activated by plugin without configuration.
- `jsxPure` is removed. This is a niche use case that was just passing down the boolean to esbuild.jsxSideEffects. ([#129](https://github.com/vitejs/vite-plugin-react/pull/129))

The support for React auto import whe using classic runtime is removed. This was prone to errors and added complexity for no good reason given the very wide support of automatic runtime nowadays. This migration path should be as simple as removing the runtime option from the config.

This release goes in hand with the upcoming Vite 4.3 release focusing on performances:

- Cache plugin load ([#141](https://github.com/vitejs/vite-plugin-react/issues/141))
- Wrap dynamic import to speedup analysis ([#143](https://github.com/vitejs/vite-plugin-react/issues/143))

Other notable changes:

- Silence "use client" warning ([#144](https://github.com/vitejs/vite-plugin-react/pull/144), fix [#137](https://github.com/vitejs/vite-plugin-react/issues/137))
- Fast Refresh is applied on JS files using automatic runtime ([#122](https://github.com/vitejs/vite-plugin-react/pull/122), fix [#83](https://github.com/vitejs/vite-plugin-react/issues/83))
- Vite 4.2 is required as a peer dependency ([#128](https://github.com/vitejs/vite-plugin-react/pull/128))
- Avoid key collision in React refresh registration ([a74dfef](https://github.com/vitejs/vite-plugin-react/commit/a74dfef), fix [#116](https://github.com/vitejs/vite-plugin-react/issues/116))
- Throw when refresh runtime is loaded twice ([#108](https://github.com/vitejs/vite-plugin-react/pull/108), fix [#101](https://github.com/vitejs/vite-plugin-react/issues/101))
- Don't force optimization of jsx-runtime ([#132](https://github.com/vitejs/vite-plugin-react/pull/132))

## 4.0.0-beta.1 (2023-04-17)

- fix: add jsx dev runtime to optimizeDeps (#147) ([3bbd8f0](https://github.com/vitejs/vite-plugin-react/commit/3bbd8f0)), closes [#147](https://github.com/vitejs/vite-plugin-react/issues/147)

## 4.0.0-beta.0 (2023-04-05)

This major version include a revamp of options:

- `include`/`exclude` now allow to completely override the files processed by the plugin ([#122](https://github.com/vitejs/vite-plugin-react/pull/122)). This is more in line with other Rollup/Vite plugins and simplify the setup of enabling Fast Refresh for `.mdx` files. This can be done like this:

```js
export default defineConfig({
  plugins: [
    { enforce: 'pre', ...mdx() },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
  ],
})
```

These changes also allow to apply Babel plugins on files outside Vite root (expect in node_modules), which improve support for monorepo (fix [#16](https://github.com/vitejs/vite-plugin-react/issues/16)).

With these changes, only the file extensions is used for filtering processed files and the query param fallback is removed.

- `fastRefresh` is removed ([#122](https://github.com/vitejs/vite-plugin-react/pull/122)). This should be correctly activated by plugin without configuration.
- `jsxPure` is removed. This is a niche use case that was just passing down the boolean to esbuild.jsxSideEffects. ([#129](https://github.com/vitejs/vite-plugin-react/pull/129))
- `jsxRuntime` is unchanged but deprecated ([#131](https://github.com/vitejs/vite-plugin-react/pull/131)) and will be removed in the next major.

This release goes in hand with the upcoming Vite 4.3 release focusing on performances:

- Cache plugin load ([#141](https://github.com/vitejs/vite-plugin-react/issues/141))
- Wrap dynamic import to speedup analysis ([#143](https://github.com/vitejs/vite-plugin-react/issues/143))

Other notable changes:

- Silence "use client" warning ([#144](https://github.com/vitejs/vite-plugin-react/pull/144), fix [#137](https://github.com/vitejs/vite-plugin-react/issues/137))
- Fast Refresh is applied on JS files using automatic runtime ([#122](https://github.com/vitejs/vite-plugin-react/pull/122), fix [#83](https://github.com/vitejs/vite-plugin-react/issues/83))
- Vite 4.2 is required as a peer dependency ([#128](https://github.com/vitejs/vite-plugin-react/pull/128))
- Avoid key collision in React refresh registration ([a74dfef](https://github.com/vitejs/vite-plugin-react/commit/a74dfef), fix [#116](https://github.com/vitejs/vite-plugin-react/issues/116))
- Throw when refresh runtime is loaded twice ([#108](https://github.com/vitejs/vite-plugin-react/pull/108), fix [#101](https://github.com/vitejs/vite-plugin-react/issues/101))
- Don't force optimization of jsx-runtime ([#132](https://github.com/vitejs/vite-plugin-react/pull/132))

## 3.1.0 (2023-02-02)

- doc: add jsxImportSource option ([38d71f6](https://github.com/vitejs/vite-plugin-react/commit/38d71f6))
- chore: bump release-scripts, typecheck package in CI, remove cache for eslint ([9af763d](https://github.com/vitejs/vite-plugin-react/commit/9af763d))
- fix: fast-refresh explain link (#97) ([6097795](https://github.com/vitejs/vite-plugin-react/commit/6097795)), closes [#97](https://github.com/vitejs/vite-plugin-react/issues/97)

## 3.1.0-beta.0 (2023-01-25)

- fix: add RefreshSig to refresh content regex (closes #52) ([c8dd1d6](https://github.com/vitejs/vite-plugin-react/commit/c8dd1d6)), closes [#52](https://github.com/vitejs/vite-plugin-react/issues/52)
- fix(deps): update all non-major dependencies (#81) ([e935a1f](https://github.com/vitejs/vite-plugin-react/commit/e935a1f)), closes [#81](https://github.com/vitejs/vite-plugin-react/issues/81)
- feat: invalidate message and fix HMR for HOC, class component & styled component (#79) ([48017b7](https://github.com/vitejs/vite-plugin-react/commit/48017b7)), closes [#79](https://github.com/vitejs/vite-plugin-react/issues/79)

## <small>3.0.1 (2023-01-05)</small>

- fix: don't invalidate when code is invalid (#67) ([9231a86](https://github.com/vitejs/vite-plugin-react/commit/9231a86)), closes [#67](https://github.com/vitejs/vite-plugin-react/issues/67)
- fix(deps): update all non-major dependencies (#69) ([0a8e099](https://github.com/vitejs/vite-plugin-react/commit/0a8e099)), closes [#69](https://github.com/vitejs/vite-plugin-react/issues/69)

## 3.0.0 (2022-12-09)

- chore: update vite to ^4.0.0 (#57) ([941b20d](https://github.com/vitejs/vite-plugin-react/commit/941b20d)), closes [#57](https://github.com/vitejs/vite-plugin-react/issues/57)
- chore(deps): update rollup (#56) ([af25ec7](https://github.com/vitejs/vite-plugin-react/commit/af25ec7)), closes [#56](https://github.com/vitejs/vite-plugin-react/issues/56)
- chore!: drop ast check for refresh boundary (#43) ([e43bd76](https://github.com/vitejs/vite-plugin-react/commit/e43bd76)), closes [#43](https://github.com/vitejs/vite-plugin-react/issues/43)

## 3.0.0-beta.0 (2022-12-05)

- chore: clean some leftovers from Vite core (#44) ([d2a3931](https://github.com/vitejs/vite-plugin-react/commit/d2a3931)), closes [#44](https://github.com/vitejs/vite-plugin-react/issues/44)
- chore: enable prettier trailing commas (#35) ([b647e74](https://github.com/vitejs/vite-plugin-react/commit/b647e74)), closes [#35](https://github.com/vitejs/vite-plugin-react/issues/35)
- chore: more package name fixes (fixes #37) (#42) ([9094c8b](https://github.com/vitejs/vite-plugin-react/commit/9094c8b)), closes [#37](https://github.com/vitejs/vite-plugin-react/issues/37) [#42](https://github.com/vitejs/vite-plugin-react/issues/42)
- chore: package setup ([ced7860](https://github.com/vitejs/vite-plugin-react/commit/ced7860))
- chore: remove unused babel automatic runtime plugins (#41) ([1464a8f](https://github.com/vitejs/vite-plugin-react/commit/1464a8f)), closes [#41](https://github.com/vitejs/vite-plugin-react/issues/41)
- chore(deps): update all non-major dependencies (#47) ([0cfe83a](https://github.com/vitejs/vite-plugin-react/commit/0cfe83a)), closes [#47](https://github.com/vitejs/vite-plugin-react/issues/47)

## 3.0.0-alpha.2 (2022-11-30)

- fix(deps): update all non-major dependencies (#11091) ([073a4bf](https://github.com/vitejs/vite/commit/073a4bf)), closes [#11091](https://github.com/vitejs/vite/issues/11091)

## 3.0.0-alpha.1 (2022-11-15)

- fix(plugin-react): jsxDev is not a function when is set NODE_ENV in env files (#10861) ([be1ba4a](https://github.com/vitejs/vite/commit/be1ba4a)), closes [#10861](https://github.com/vitejs/vite/issues/10861)
- perf: regexp perf issues, refactor regexp stylistic issues (#10905) ([fc007df](https://github.com/vitejs/vite/commit/fc007df)), closes [#10905](https://github.com/vitejs/vite/issues/10905)

## 3.0.0-alpha.0 (2022-11-08)

- feat!: transform jsx with esbuild instead of babel (#9590) ([f677b62](https://github.com/vitejs/vite/commit/f677b62)), closes [#9590](https://github.com/vitejs/vite/issues/9590)
- fix(deps): update all non-major dependencies (#10804) ([f686afa](https://github.com/vitejs/vite/commit/f686afa)), closes [#10804](https://github.com/vitejs/vite/issues/10804)

## 2.2.0 (2022-10-26)

- fix(deps): update all non-major dependencies (#10610) ([bb95467](https://github.com/vitejs/vite/commit/bb95467)), closes [#10610](https://github.com/vitejs/vite/issues/10610)
- fix(plugin-react): update `package.json` (#10479) ([7f45eb5](https://github.com/vitejs/vite/commit/7f45eb5)), closes [#10479](https://github.com/vitejs/vite/issues/10479)
- chore(deps): update all non-major dependencies (#10393) ([f519423](https://github.com/vitejs/vite/commit/f519423)), closes [#10393](https://github.com/vitejs/vite/issues/10393)

## 2.2.0-beta.0 (2022-10-05)

- fix(deps): update all non-major dependencies (#10077) ([caf00c8](https://github.com/vitejs/vite/commit/caf00c8)), closes [#10077](https://github.com/vitejs/vite/issues/10077)
- fix(deps): update all non-major dependencies (#10160) ([6233c83](https://github.com/vitejs/vite/commit/6233c83)), closes [#10160](https://github.com/vitejs/vite/issues/10160)
- fix(deps): update all non-major dependencies (#10316) ([a38b450](https://github.com/vitejs/vite/commit/a38b450)), closes [#10316](https://github.com/vitejs/vite/issues/10316)
- fix(deps): update all non-major dependencies (#9985) ([855f2f0](https://github.com/vitejs/vite/commit/855f2f0)), closes [#9985](https://github.com/vitejs/vite/issues/9985)
- fix(react): conditionally self-accept fast-refresh HMR (#10239) ([e976b06](https://github.com/vitejs/vite/commit/e976b06)), closes [#10239](https://github.com/vitejs/vite/issues/10239)
- feat: add `throwIfNamespace` option for custom JSX runtime (#9571) ([f842f74](https://github.com/vitejs/vite/commit/f842f74)), closes [#9571](https://github.com/vitejs/vite/issues/9571)
- refactor(types): bundle client types (#9966) ([da632bf](https://github.com/vitejs/vite/commit/da632bf)), closes [#9966](https://github.com/vitejs/vite/issues/9966)

## 2.1.0 (2022-09-05)

- fix(plugin-react): duplicate **self prop and **source prop (#9387) ([c89de3a](https://github.com/vitejs/vite/commit/c89de3a)), closes [#9387](https://github.com/vitejs/vite/issues/9387)

## 2.1.0-beta.0 (2022-08-29)

- docs: fix typo (#9855) ([583f185](https://github.com/vitejs/vite/commit/583f185)), closes [#9855](https://github.com/vitejs/vite/issues/9855)
- fix: add `react` to `optimizeDeps` (#9056) ([bc4a627](https://github.com/vitejs/vite/commit/bc4a627)), closes [#9056](https://github.com/vitejs/vite/issues/9056)
- fix(deps): update all non-major dependencies (#9888) ([e35a58b](https://github.com/vitejs/vite/commit/e35a58b)), closes [#9888](https://github.com/vitejs/vite/issues/9888)

## <small>2.0.1 (2022-08-11)</small>

- fix: don't count class declarations as react fast refresh boundry (fixes #3675) (#8887) ([5a18284](https://github.com/vitejs/vite/commit/5a18284)), closes [#3675](https://github.com/vitejs/vite/issues/3675) [#8887](https://github.com/vitejs/vite/issues/8887)
- fix: mention that Node.js 13/15 support is dropped (fixes #9113) (#9116) ([2826303](https://github.com/vitejs/vite/commit/2826303)), closes [#9113](https://github.com/vitejs/vite/issues/9113) [#9116](https://github.com/vitejs/vite/issues/9116)
- fix(deps): update all non-major dependencies (#9176) ([31d3b70](https://github.com/vitejs/vite/commit/31d3b70)), closes [#9176](https://github.com/vitejs/vite/issues/9176)
- fix(deps): update all non-major dependencies (#9575) ([8071325](https://github.com/vitejs/vite/commit/8071325)), closes [#9575](https://github.com/vitejs/vite/issues/9575)
- fix(plugin-react): wrong substitution causes `React is not defined` (#9386) ([8a5b575](https://github.com/vitejs/vite/commit/8a5b575)), closes [#9386](https://github.com/vitejs/vite/issues/9386)
- docs: fix server options link (#9242) ([29db3ea](https://github.com/vitejs/vite/commit/29db3ea)), closes [#9242](https://github.com/vitejs/vite/issues/9242)

## 2.0.0 (2022-07-13)

- chore: 3.0 release notes and bump peer deps (#9072) ([427ba26](https://github.com/vitejs/vite/commit/427ba26)), closes [#9072](https://github.com/vitejs/vite/issues/9072)
- fix(react): sourcemap incorrect warning and classic runtime sourcemap (#9006) ([bdae7fa](https://github.com/vitejs/vite/commit/bdae7fa)), closes [#9006](https://github.com/vitejs/vite/issues/9006)

## 2.0.0-beta.1 (2022-07-06)

- fix(deps): update all non-major dependencies (#8802) ([a4a634d](https://github.com/vitejs/vite/commit/a4a634d)), closes [#8802](https://github.com/vitejs/vite/issues/8802)
- fix(plugin-react): pass correct context to runPluginOverrides (#8809) ([09742e2](https://github.com/vitejs/vite/commit/09742e2)), closes [#8809](https://github.com/vitejs/vite/issues/8809)
- fix(plugin-react): return code if should skip in transform (fix #7586) (#8676) ([206e22a](https://github.com/vitejs/vite/commit/206e22a)), closes [#7586](https://github.com/vitejs/vite/issues/7586) [#8676](https://github.com/vitejs/vite/issues/8676)
- chore: use `tsx` directly instead of indirect `esno` (#8773) ([f018f13](https://github.com/vitejs/vite/commit/f018f13)), closes [#8773](https://github.com/vitejs/vite/issues/8773)

## 2.0.0-beta.0 (2022-06-21)

- feat: bump minimum node version to 14.18.0 (#8662) ([8a05432](https://github.com/vitejs/vite/commit/8a05432)), closes [#8662](https://github.com/vitejs/vite/issues/8662)
- feat: experimental.buildAdvancedBaseOptions (#8450) ([8ef7333](https://github.com/vitejs/vite/commit/8ef7333)), closes [#8450](https://github.com/vitejs/vite/issues/8450)
- feat: expose createFilter util (#8562) ([c5c424a](https://github.com/vitejs/vite/commit/c5c424a)), closes [#8562](https://github.com/vitejs/vite/issues/8562)
- chore: update major deps (#8572) ([0e20949](https://github.com/vitejs/vite/commit/0e20949)), closes [#8572](https://github.com/vitejs/vite/issues/8572)
- chore: use node prefix (#8309) ([60721ac](https://github.com/vitejs/vite/commit/60721ac)), closes [#8309](https://github.com/vitejs/vite/issues/8309)
- chore(deps): update all non-major dependencies (#8669) ([628863d](https://github.com/vitejs/vite/commit/628863d)), closes [#8669](https://github.com/vitejs/vite/issues/8669)
- fix(plugin-react): set `this-is-undefined-in-esm` to silent if classic runtime (#8674) ([f0aecba](https://github.com/vitejs/vite/commit/f0aecba)), closes [#8674](https://github.com/vitejs/vite/issues/8674)

## 2.0.0-alpha.3 (2022-06-12)

- fix(deps): update all non-major dependencies (#8391) ([842f995](https://github.com/vitejs/vite/commit/842f995)), closes [#8391](https://github.com/vitejs/vite/issues/8391)
- fix(plugin-react): apply manual runtime interop (#8546) ([f09299c](https://github.com/vitejs/vite/commit/f09299c)), closes [#8546](https://github.com/vitejs/vite/issues/8546)
- fix(plugin-react): support import namespace in `parseReactAlias` (#5313) ([05b91cd](https://github.com/vitejs/vite/commit/05b91cd)), closes [#5313](https://github.com/vitejs/vite/issues/5313)
- refactor: remove hooks ssr param support (#8491) ([f59adf8](https://github.com/vitejs/vite/commit/f59adf8)), closes [#8491](https://github.com/vitejs/vite/issues/8491)

## 2.0.0-alpha.2 (2022-05-26)

- feat: non-blocking esbuild optimization at build time (#8280) ([909cf9c](https://github.com/vitejs/vite/commit/909cf9c)), closes [#8280](https://github.com/vitejs/vite/issues/8280)
- feat(plugin-react): allow options.babel to be a function (#6238) ([f4d6262](https://github.com/vitejs/vite/commit/f4d6262)), closes [#6238](https://github.com/vitejs/vite/issues/6238)
- fix(deps): update all non-major dependencies (#8281) ([c68db4d](https://github.com/vitejs/vite/commit/c68db4d)), closes [#8281](https://github.com/vitejs/vite/issues/8281)
- fix(plugin-react): broken optimized deps dir check (#8255) ([9e2a1ea](https://github.com/vitejs/vite/commit/9e2a1ea)), closes [#8255](https://github.com/vitejs/vite/issues/8255)
- chore: use `esno` to replace `ts-node` (#8162) ([c18a5f3](https://github.com/vitejs/vite/commit/c18a5f3)), closes [#8162](https://github.com/vitejs/vite/issues/8162)

## 2.0.0-alpha.1 (2022-05-19)

- fix: rewrite CJS specific funcs/vars in plugins (#8227) ([9baa70b](https://github.com/vitejs/vite/commit/9baa70b)), closes [#8227](https://github.com/vitejs/vite/issues/8227)
- build!: bump targets (#8045) ([66efd69](https://github.com/vitejs/vite/commit/66efd69)), closes [#8045](https://github.com/vitejs/vite/issues/8045)
- chore: enable `import/no-duplicates` eslint rule (#8199) ([11243de](https://github.com/vitejs/vite/commit/11243de)), closes [#8199](https://github.com/vitejs/vite/issues/8199)

## 2.0.0-alpha.0 (2022-05-13)

- chore: restore-jsx.spec.ts lint (#8004) ([f1af941](https://github.com/vitejs/vite/commit/f1af941)), closes [#8004](https://github.com/vitejs/vite/issues/8004)
- chore: revert vitejs/vite#8152 (#8161) ([85b8b55](https://github.com/vitejs/vite/commit/85b8b55)), closes [vitejs/vite#8152](https://github.com/vitejs/vite/issues/8152) [#8161](https://github.com/vitejs/vite/issues/8161)
- chore: update plugins peer deps ([d57c23c](https://github.com/vitejs/vite/commit/d57c23c))
- chore: use `unbuild` to bundle plugins (#8139) ([638b168](https://github.com/vitejs/vite/commit/638b168)), closes [#8139](https://github.com/vitejs/vite/issues/8139)
- chore(deps): use `esno` to replace `ts-node` (#8152) ([2363bd3](https://github.com/vitejs/vite/commit/2363bd3)), closes [#8152](https://github.com/vitejs/vite/issues/8152)
- chore(lint): sort for imports (#8113) ([43a58dd](https://github.com/vitejs/vite/commit/43a58dd)), closes [#8113](https://github.com/vitejs/vite/issues/8113)
- chore(plugin-react): add vite peer dep (#8083) ([2d978f7](https://github.com/vitejs/vite/commit/2d978f7)), closes [#8083](https://github.com/vitejs/vite/issues/8083)
- fix: use Vitest for unit testing, clean regex bug (#8040) ([63cd53d](https://github.com/vitejs/vite/commit/63cd53d)), closes [#8040](https://github.com/vitejs/vite/issues/8040)
- refactor: remove deprecated api for 3.0 (#5868) ([b5c3709](https://github.com/vitejs/vite/commit/b5c3709)), closes [#5868](https://github.com/vitejs/vite/issues/5868)
- build!: remove node v12 support (#7833) ([eeac2d2](https://github.com/vitejs/vite/commit/eeac2d2)), closes [#7833](https://github.com/vitejs/vite/issues/7833)

## <small>1.3.2 (2022-05-02)</small>

- fix(plugin-react): React is not defined when component name is lowercase (#6838) ([bf40e5c](https://github.com/vitejs/vite/commit/bf40e5c)), closes [#6838](https://github.com/vitejs/vite/issues/6838)
- chore(deps): update all non-major dependencies (#7780) ([eba9d05](https://github.com/vitejs/vite/commit/eba9d05)), closes [#7780](https://github.com/vitejs/vite/issues/7780)
- chore(deps): update all non-major dependencies (#7949) ([b877d30](https://github.com/vitejs/vite/commit/b877d30)), closes [#7949](https://github.com/vitejs/vite/issues/7949)

## <small>1.3.1 (2022-04-13)</small>

- fix(deps): update all non-major dependencies (#7668) ([485263c](https://github.com/vitejs/vite/commit/485263c)), closes [#7668](https://github.com/vitejs/vite/issues/7668)
- chore: fix term cases (#7553) ([c296130](https://github.com/vitejs/vite/commit/c296130)), closes [#7553](https://github.com/vitejs/vite/issues/7553)
- chore(deps): update all non-major dependencies (#7603) ([fc51a15](https://github.com/vitejs/vite/commit/fc51a15)), closes [#7603](https://github.com/vitejs/vite/issues/7603)

## 1.3.0 (2022-03-30)

- feat(plugin-react): adding jsxPure option (#7088) ([d451435](https://github.com/vitejs/vite/commit/d451435)), closes [#7088](https://github.com/vitejs/vite/issues/7088)
- fix(deps): update all non-major dependencies (#6782) ([e38be3e](https://github.com/vitejs/vite/commit/e38be3e)), closes [#6782](https://github.com/vitejs/vite/issues/6782)
- fix(deps): update all non-major dependencies (#7392) ([b63fc3b](https://github.com/vitejs/vite/commit/b63fc3b)), closes [#7392](https://github.com/vitejs/vite/issues/7392)
- chore: fix publish, build vite before plugin-react and plugin-vue (#6988) ([620a9bd](https://github.com/vitejs/vite/commit/620a9bd)), closes [#6988](https://github.com/vitejs/vite/issues/6988)
- chore(deps): update all non-major dependencies (#6905) ([839665c](https://github.com/vitejs/vite/commit/839665c)), closes [#6905](https://github.com/vitejs/vite/issues/6905)
- workflow: separate version bumping and publishing on release (#6879) ([fe8ef39](https://github.com/vitejs/vite/commit/fe8ef39)), closes [#6879](https://github.com/vitejs/vite/issues/6879)

# [1.2.0](https://github.com/vitejs/vite/compare/plugin-react@1.1.4...plugin-react@1.2.0) (2022-02-09)

### Features

- **plugin-react:** ensure `overrides` array exists before `api.reactBabel` hooks are called ([#6750](https://github.com/vitejs/vite/issues/6750)) ([104bdb5](https://github.com/vitejs/vite/commit/104bdb5b5e44e79bf3456cabe15f3753f7c1ef28))

## [1.1.4](https://github.com/vitejs/vite/compare/plugin-react@1.1.3...plugin-react@1.1.4) (2022-01-04)

### Bug Fixes

- **plugin-react:** check for import React statement in .js files ([#6320](https://github.com/vitejs/vite/issues/6320)) ([bd9e97b](https://github.com/vitejs/vite/commit/bd9e97bd1b9156059b78b531871a12f6f47c04b1)), closes [#6148](https://github.com/vitejs/vite/issues/6148) [#6148](https://github.com/vitejs/vite/issues/6148)
- **plugin-react:** restore-jsx bug when component name is lowercase ([#6110](https://github.com/vitejs/vite/issues/6110)) ([ce65c56](https://github.com/vitejs/vite/commit/ce65c567a64fad3be4209cbd1132e62e905fe349))

### Features

- **plugin-react:** check for `api.reactBabel` on other plugins ([#5454](https://github.com/vitejs/vite/issues/5454)) ([2ab41b3](https://github.com/vitejs/vite/commit/2ab41b3184d2452be4fa0b427f05c791311644aa))

## [1.1.3](https://github.com/vitejs/vite/compare/plugin-react@1.1.2...plugin-react@1.1.3) (2021-12-13)

### Bug Fixes

- **plugin-react:** only detect preamble in hmr context ([#6096](https://github.com/vitejs/vite/issues/6096)) ([8735294](https://github.com/vitejs/vite/commit/8735294055ce16308a6b8302eba4538f4a2931d0))

## [1.1.2](https://github.com/vitejs/vite/compare/plugin-react@1.1.1...plugin-react@1.1.2) (2021-12-13)

### Bug Fixes

- ignore babel config when running restore-jsx ([#6047](https://github.com/vitejs/vite/issues/6047)) ([9c2843c](https://github.com/vitejs/vite/commit/9c2843cf0506844ee32f042a04c22c440434df2a))

## [1.1.1](https://github.com/vitejs/vite/compare/plugin-react@1.1.0...plugin-react@1.1.1) (2021-12-07)

# [1.1.0](https://github.com/vitejs/vite/compare/plugin-react@1.1.0-beta.1...plugin-react@1.1.0) (2021-11-22)

# [1.1.0-beta.1](https://github.com/vitejs/vite/compare/plugin-react@1.1.0-beta.0...plugin-react@1.1.0-beta.1) (2021-11-19)

### Bug Fixes

- **plugin-react:** apply `babel.plugins` to project files only ([#5255](https://github.com/vitejs/vite/issues/5255)) ([377d0be](https://github.com/vitejs/vite/commit/377d0be5cf85a50240e160beaaafda77b7199452))
- **plugin-react:** remove querystring from sourcemap filename ([#5760](https://github.com/vitejs/vite/issues/5760)) ([d93a9fa](https://github.com/vitejs/vite/commit/d93a9fab8986f3659e79d7b0b065e99ef625a5dd))
- **plugin-react:** restore usage of extension instead of id ([#5761](https://github.com/vitejs/vite/issues/5761)) ([59471b1](https://github.com/vitejs/vite/commit/59471b186612d3da0083543e23d660747d3287f3))
- **plugin-react:** uncompiled JSX in linked pkgs ([#5669](https://github.com/vitejs/vite/issues/5669)) ([41a7c9c](https://github.com/vitejs/vite/commit/41a7c9ccfbc1a7bc60aec672056eac3966ddd036))

# [1.1.0-beta.0](https://github.com/vitejs/vite/compare/plugin-react@1.0.6...plugin-react@1.1.0-beta.0) (2021-10-28)

### Bug Fixes

- **plugin-react:** avoid mangling the sourcemaps of virtual modules ([#5421](https://github.com/vitejs/vite/issues/5421)) ([8556ffe](https://github.com/vitejs/vite/commit/8556ffe3c59952d7e64565422bf433699e97756e))

## [1.0.6](https://github.com/vitejs/vite/compare/plugin-react@1.0.5...plugin-react@1.0.6) (2021-10-25)

### Bug Fixes

- **plugin-react:** account for querystring in transform hook ([#5333](https://github.com/vitejs/vite/issues/5333)) ([13c3813](https://github.com/vitejs/vite/commit/13c381368caf8302a0c5b7cec07dfc0eb344bede))

## [1.0.5](https://github.com/vitejs/vite/compare/plugin-react@1.0.4...plugin-react@1.0.5) (2021-10-18)

### Bug Fixes

- **plugin-react:** fix regex for react imports ([#5274](https://github.com/vitejs/vite/issues/5274)) ([00b3e4f](https://github.com/vitejs/vite/commit/00b3e4fe102652b2d92e76a05e8c7a5b766b1d03))
- **plugin-react:** transform .mjs files ([#5314](https://github.com/vitejs/vite/issues/5314)) ([8ce2ea1](https://github.com/vitejs/vite/commit/8ce2ea17d51b80c660f2cdca7844d4fc6991baed))

## [1.0.4](https://github.com/vitejs/vite/compare/plugin-react@1.0.3...plugin-react@1.0.4) (2021-10-11)

## [1.0.3](https://github.com/vitejs/vite/compare/plugin-react@1.0.2...plugin-react@1.0.3) (2021-10-11)

### Bug Fixes

- **plugin-react:** turn off jsx for .ts ([#5198](https://github.com/vitejs/vite/issues/5198)) ([916f9d3](https://github.com/vitejs/vite/commit/916f9d3984d5e83f7cb869b3606a1f043a814b97)), closes [#5102](https://github.com/vitejs/vite/issues/5102)

## [1.0.2](https://github.com/vitejs/vite/compare/plugin-react@1.0.1...plugin-react@1.0.2) (2021-10-05)

### Bug Fixes

- **plugin-react:** respect `opts.fastRefresh` in viteBabel ([#5139](https://github.com/vitejs/vite/issues/5139)) ([5cf4e69](https://github.com/vitejs/vite/commit/5cf4e69cd3afc7f960e02072171c7c441747e8f0))

## [1.0.1](https://github.com/vitejs/vite/compare/plugin-react@1.0.0...plugin-react@1.0.1) (2021-09-22)

### Bug Fixes

- **plugin-react:** inconsistent error warning ([#5031](https://github.com/vitejs/vite/issues/5031)) ([89ba8ce](https://github.com/vitejs/vite/commit/89ba8cedb8636968516bc38b37e1d2d5ed6234bb))

### Features

- **plugin-react:** pre-optimize jsx-dev-runtime ([#5036](https://github.com/vitejs/vite/issues/5036)) ([a34dd27](https://github.com/vitejs/vite/commit/a34dd2725e64fedf626e23ba9ced480f5465a59b))

# [1.0.0](https://github.com/vitejs/vite/compare/plugin-react@1.0.0-beta.0...plugin-react@1.0.0) (2021-09-22)

See the [readme](https://github.com/aleclarson/vite/blob/f8129ce6e87684eb7a4edd8106351c5d98207d7b/packages/plugin-react/README.md#vitejsplugin-react-) for more information.

- Support for [automatic JSX runtime](https://github.com/alloc/vite-react-jsx)
- Babel integration for both development and production builds
- Add `react` and `react-dom` to [`resolve.dedupe`](https://vite.dev/config/#resolve-dedupe) automatically

Thanks to @aleclarson and @pengx17 for preparing this release!

# Legacy

Before `@vitejs/plugin-react`, there was `@vitejs/plugin-react-refresh`.

See its changelog [here.](https://github.com/vitejs/vite/blob/b9e837a2aa2c1a7a8f93d4b19df9f72fd3c6fb09/packages/plugin-react-refresh/CHANGELOG.md)
