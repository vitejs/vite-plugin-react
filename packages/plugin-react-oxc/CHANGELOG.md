# Changelog

## Unreleased

### Add `filter` for rolldown-vite

Added `filter` so that it is more performant when running this plugin with rolldown-powered version of Vite.

### Skip HMR for JSX files with hooks

The current HMR implementation was trying to all HMR files that contains either hooks or components, but this was working only for components and lead to HMR invalidation for JSX files containing hooks.

The best solution would have been to support HMR for hooks, but in my testing it was sometimes leading to stale updates. So this simple and reliable solution is to skip HMR for these files and have the components handle the updates, like any other hooks file.

## 0.1.1 (2025-04-10)

## 0.1.0 (2025-04-09)

- Create Oxc plugin
