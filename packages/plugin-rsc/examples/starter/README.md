# Vite + RSC

This example shows how to setup a React application with [Server Component](https://react.dev/reference/rsc/server-components) features on Vite using [`@hiogawa/vite-rsc`](https://github.com/hi-ogawa/vite-plugins/tree/main/packages/rsc).

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/hi-ogawa/vite-plugins/tree/main/packages/rsc/examples/starter)

```sh
# run dev server
npm run dev

# build for production and preview
npm run build
npm run preview
```

## API usages

See [`@hiogawa/vite-rsc`](https://github.com/hi-ogawa/vite-plugins/tree/main/packages/rsc) for the documentation.

- [`vite.config.ts`](./vite.config.ts)
  - `@higoawa/vite-rsc/plugin`
- [`./src/framework/entry.rsc.tsx`](./src/framework/entry.rsc.tsx)
  - `@hiogawa/vite-rsc/rsc`
  - `import.meta.viteRsc.loadModule`
- [`./src/framework/entry.ssr.tsx`](./src/framework/entry.ssr.tsx)
  - `@hiogawa/vite-rsc/ssr`
  - `@hiogawa/vite-rsc/rsc-html-stream/ssr`
  - `import.meta.viteRsc.loadBootstrapScriptContent`
- [`./src/framework/entry.browser.tsx`](./src/framework/entry.browser.tsx)
  - `@hiogawa/vite-rsc/browser`
  - `@hiogawa/vite-rsc/rsc-html-stream/browser`

## Notes

- [`./src/framework/entry.{browser,rsc,ssr}.tsx`](./src/framework) (with inline comments) provides an overview of how low level RSC (React flight) API can be used to build RSC framework.
- You can use [`vite-plugin-inspect`](https://github.com/antfu-collective/vite-plugin-inspect) to understand how `"use client"` and `"use server"` directives are transformed internally.
