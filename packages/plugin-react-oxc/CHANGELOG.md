# Changelog

## Unreleased

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
