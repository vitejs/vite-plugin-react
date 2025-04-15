# Changelog

## Unreleased

## 3.9.0 (2025-04-15)

### Make compatible with rolldown-vite

This plugin is now compatible with rolldown-powered version of Vite.

## 3.9.0-beta.3 (2025-04-15)

### Add `reactRefreshHost` option

Add `reactRefreshHost` option to set a React Fast Refresh runtime URL prefix.
This is useful in a module federation context to enable HMR by specifying the host application URL in the Vite config of a remote application.
See full discussion here: https://github.com/module-federation/vite/issues/183#issuecomment-2751825367

```ts
export default defineConfig({
  plugins: [react({ reactRefreshHost: 'http://localhost:3000' })],
})
```

## 3.9.0-beta.2 (2025-04-09)

## 3.9.0-beta.0 (2025-04-09)

## 3.8.1

### Remove WebContainers warning [#268](https://github.com/vitejs/vite-plugin-react-swc/pull/268)

SWC is now supported in WebContainers 🎉

## 3.8.0

### Add useAtYourOwnRisk_mutateSwcOptions option

The future of Vite is with OXC, and from the beginning this was a design choice to not exposed too many specialties from SWC so that Vite React users can move to another transformer later.
Also debugging why some specific version of decorators with some other unstable/legacy feature doesn't work is not fun, so we won't provide support for it, hence the name `useAtYourOwnRisk`.

```ts
react({
  useAtYourOwnRisk_mutateSwcOptions(options) {
    options.jsc.parser.decorators = true;
    options.jsc.transform.decoratorVersion = "2022-03";
  },
});
```

## 3.7.2

### Add Vite 6 to peerDependencies range [#207](https://github.com/vitejs/vite-plugin-react-swc/pull/207)

Thanks @RobinTail

### Revert throw when refresh runtime is loaded twice [#237](https://github.com/vitejs/vite-plugin-react-swc/issues/237)

Revert the throw when refresh runtime is loaded twice to enable usage in micro frontend apps. This was added to help fix setup usage, and this is not worth an annoying warning for others or a config parameter.

This revert was done in the Babel plugin last year and I didn't port it back.

## 3.7.1

Ignore directive sourcemap error [#231](https://github.com/vitejs/vite-plugin-react-swc/issues/231)

## 3.7.0

### Support HMR for class components

This is a long overdue and should fix some issues people had with HMR when migrating from CRA.

## 3.6.0

### Add parserConfig option

This will unlock to use the plugin in some use cases where the original source code is not in TS. Using this option to keep using JSX inside `.js` files is highly discouraged and can be removed in any future version.

## 3.5.0

### Update peer dependency range to target Vite 5

There were no breaking change that impacted this plugin, so any combination of React plugins and Vite core version will work.

### Align jsx runtime for optimized dependencies

This will only affect people using internal libraries that contains untranspiled JSX. This change aligns the optimizer with the source code and avoid issues when the published source don't have `React` in the scope.

Reminder: While being partially supported in Vite, publishing TS & JSX outside of internal libraries is highly discouraged.

## 3.4.1

### Add support for `.mts` (fixes [#161](https://github.com/vitejs/vite-plugin-react-swc/issues/161))

Using CJS in source code will not work in Vite (and will never be supported), so this is better to only use `.ts`.

But to better align with [Vite core defaults](https://vite.dev/config/shared-options.html#resolve-extensions), `.mts` extension will now be processed like `.ts`. This maybe reverted in a future major.

## 3.4.0

- Add `devTarget` option (fixes [#141](https://github.com/vitejs/vite-plugin-react-swc/issues/141))
- Disable Fast Refresh based on `config.server.hmr === false` instead of `process.env.TEST`
- Warn when plugin is in WebContainers (see [#118](https://github.com/vitejs/vite-plugin-react-swc/issues/118))
- Better invalidation message when an export is added & fix HMR for export of nullish values ([#143](https://github.com/vitejs/vite-plugin-react-swc/issues/143))

## 3.3.2

- Support [Vitest deps.experimentalOptimizer](https://vitest.dev/config/#deps-experimentaloptimizer) ([#115](https://github.com/vitejs/vite-plugin-react-swc/pull/115))

## 3.3.1

- Add `type: module` to package.json ([#101](https://github.com/vitejs/vite-plugin-react-swc/pull/101)). Because the library already publish `.cjs` & `.mjs` files, the only change is for typing when using the node16 module resolution (fixes [#95](https://github.com/vitejs/vite-plugin-react-swc/issues/95))
- Throw an error when the MDX plugin is after this one ([#100](https://github.com/vitejs/vite-plugin-react-swc/pull/100)). This is an expected breaking change added in `3.2.0` and this should people that were using both plugins before this version to migrate.

## 3.3.0

- Support TS/JSX in node_modules to help the community experiment with it. Note that for now this not supported by TS and errors from these files cannot be silenced if the user is using a stricter configuration than the library author: https://github.com/microsoft/TypeScript/issues/30511. I advise to use it only for internal libraries for now (fixes #53)
- Silence `"use client"` warning when building library like `@tanstack/react-query`
- Fix fast refresh issue when exporting a component with a name that shadow another local component

This release goes in hand with the upcoming Vite 4.3 release focusing on performances:

- Move resolve of runtime code into a "pre" plugin ([#79](https://github.com/vitejs/vite-plugin-react-swc/pull/79))
- Wrap dynamic import to speedup analysis ([#80](https://github.com/vitejs/vite-plugin-react-swc/pull/80))

## 3.2.0

- Support HMR for MDX (fixes #52)
- Fix: when using plugins, apply SWC before esbuild so that automatic runtime is respected for JSX (fixes #56)
- Fix: use jsxImportSource in optimizeDeps

## 3.1.0

- Support plugins via the new `plugins` options
- Support TypeScript decorators via the new `tsDecorators` option. This requires `experimentalDecorators` in tsconfig.
- Fix HMR for styled components exported alongside other components
- Update embedded refresh runtime to 0.14 (fixes [#46](https://github.com/vitejs/vite-plugin-react-swc/issues/46))

## 3.0.1

- Support Emotion via the new `jsxImportSource` option (fixes [#25](https://github.com/vitejs/vite-plugin-react-swc/issues/25))

To use it with Emotion, update your config to:

```ts
export default defineConfig({
  plugins: [react({ jsxImportSource: "@emotion/react" })],
});
```

- Fix HMR when using Vite `base` option (fixes [#18](https://github.com/vitejs/vite-plugin-react-swc/issues/18))
- Fix usage with workers (fixes [#23](https://github.com/vitejs/vite-plugin-react-swc/issues/23))
- Fix usage with `Vite Ruby` and `Laravel Vite` ([#20](https://github.com/vitejs/vite-plugin-react-swc/pull/20))
- Fix plugin default export when using commonjs (fixes [#14](https://github.com/vitejs/vite-plugin-react-swc/issues/14))

## 3.0.0

This is plugin is now stable! 🎉

To migrate from `vite-plugin-swc-react-refresh`, see the `3.0.0-beta.0` changelog.

## 3.0.0-beta.2

- breaking: update plugin name to `vite:react-swc` to match official plugins naming
- fix: don't add React Refresh wrapper for SSR transform (fixes [#11](https://github.com/vitejs/vite-plugin-react-swc/issues/11))

## 3.0.0-beta.1

Fix package.json exports fields

## 3.0.0-beta.0

This is the first beta version of the official plugin for using [SWC](https://swc.rs/) with React in Vite!

Some breaking changes have been made to make the plugin closer to the Babel one while keeping the smallest API surface possible to reduce bugs, encourage future-proof compilation output and allow easier opt-in into future perf improvements (caching, move to other native toolchain, ...):

- Automatically enable automatic JSX runtime. "classic" runtime is not supported
- Skip transformation for `.js` files
- Enforce [useDefineForClassFields](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#the-usedefineforclassfields-flag-and-the-declare-property-modifier)
- Don't pass `esbuild.define` config option to SWC. You can use the [top level define option](https://vite.dev/config/shared-options.html#define) instead
- Use default export

To migrate, change your config to:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
});
```

This new release also include a runtime check for React refresh boundaries. When the conditions are not met (most of the time, exporting React components alongside functions or constant), the module is invalidated with a warning message to help you catch issues while keeping you page up-to date with code changes.

## 2.2.1

Skip react-refresh on SSR (Fixes [#2](https://github.com/vitejs/vite-plugin-react-swc/issues/2))

## 2.2.0

- Always provide parser options to fix issue with `.jsx` imports. Relying on file extension for this is more buggy [than I though](https://github.com/swc-project/swc/issues/3297)
- Extract line and column in SWC errors to make overlay filename clickable
- Fix plugin name (`react-refresh` -> `swc-react-refresh`)

## 2.1.0

Add source maps support

## 2.0.3

Include `react/jsx-dev-runtime` for dependencies optimisation when using automatic runtime.

## 2.0.2

Unpinned `@swc/core` to get new features (like TS instantiation expression) despite a [30mb bump of bundle size](https://github.com/swc-project/swc/issues/3899)

## 2.0.1

Fix esbuild property in documentation.

## 2.0.0

Breaking: Use named export instead of default export for better esm/cjs interop.

To migrate, replace your import by `import { swcReactRefresh } from "vite-plugin-swc-react-refresh";`

The JSX automatic runtime is also now supported if you bump esbuild to at least [0.14.51](https://github.com/evanw/esbuild/releases/tag/v0.14.51).

To use it, update your config from `esbuild: { jsxInject: 'import React from "react"' },` to `esbuild: { jsx: "automatic" },`

## 0.1.2

- Add vite as peer dependency
- Pin @swc/core version to 1.2.141 to avoid a 30mb bump of bundle size

## 0.1.1

Add LICENSE

## 0.1.0

Initial release
