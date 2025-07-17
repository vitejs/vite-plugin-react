# rsc react-router

https://vite-rsc-react-router.hiro18181.workers.dev

This example demonstrates how to integrate [React Router RSC](https://reactrouter.com/how-to/react-server-components) with `@vitejs/plugin-rsc`. React Router now provides official React Server Components support, allowing you to build full-stack applications with server-side rendering and client-side routing.

See also:

- [React Router RSC documentation](https://reactrouter.com/how-to/react-server-components)
- [React Router RSC announcement](https://remix.run/blog/react-router-and-react-server-components)
- [`rsc-movies`](https://github.com/hi-ogawa/rsc-movies/)

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/react-router?file=src%2Froutes%2Froot.tsx)

Or try it locally by:

```sh
npx giget gh:vitejs/vite-plugin-react/packages/plugin-rsc/examples/react-router my-app
cd my-app
npm i
npm run dev
npm run build
npm run preview

# run on @cloudflare/vite-plugin and deploy.
# a separate configuration is found in ./cf/vite.config.ts
npm run cf-dev
npm run cf-build
npm run cf-preview
npm run cf-release
```
