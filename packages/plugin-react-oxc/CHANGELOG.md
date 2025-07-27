# Changelog

## Unreleased

### Allow processing files in `node_modules`

The default value of `exclude` options is now `[/\/node_modules\//]` to allow processing files in `node_modules` directory. It was previously `[]` and files in `node_modules` was always excluded regardless of the value of `exclude` option.

### Require Node 20.19+, 22.12+

This plugin now requires Node 20.19+ or 22.12+.

## 0.3.0 (2025-07-18)

### Add HMR support for compound components ([#518](https://github.com/vitejs/vite-plugin-react/pull/518))

HMR now works for compound components like this:

```tsx
const Root = () => <div>Accordion Root</div>
const Item = () => <div>Accordion Item</div>

export const Accordion = { Root, Item }
```

### Return `Plugin[]` instead of `PluginOption[]` ([#537](https://github.com/vitejs/vite-plugin-react/pull/537))

The return type has changed from `react(): PluginOption[]` to more specialized type `react(): Plugin[]`. This allows for type-safe manipulation of plugins, for example:

```tsx
// previously this causes type errors
react()
  .map(p => ({ ...p, applyToEnvironment: e => e.name === 'client' }))
```

## 0.2.3 (2025-06-16)

### Disable refresh transform when `server.hmr: false` is set [#502](https://github.com/vitejs/vite-plugin-react/pull/502)

This fixes "`$RefreshReg$` is not defined" error when running Vitest with the plugin.

## 0.2.2 (2025-06-10)

### Add Vite 7-beta to peerDependencies range [#497](https://github.com/vitejs/vite-plugin-react/pull/497)

React plugins are compatible with Vite 7, this removes the warning when testing the beta.

## 0.2.1 (2025-06-03)

### Add explicit semicolon in preambleCode [#485](https://github.com/vitejs/vite-plugin-react/pull/485)

This fixes an edge case when using HTML minifiers that strips line breaks aggressively.

## 0.2.0 (2025-05-23)

### Add `filter` for rolldown-vite [#470](https://github.com/vitejs/vite-plugin-react/pull/470)

Added `filter` so that it is more performant when running this plugin with rolldown-powered version of Vite.

### Skip HMR for JSX files with hooks [#480](https://github.com/vitejs/vite-plugin-react/pull/480)

This removes the HMR warning for hooks with JSX.

## 0.1.1 (2025-04-10)

## 0.1.0 (2025-04-09)

- Create Oxc plugin
