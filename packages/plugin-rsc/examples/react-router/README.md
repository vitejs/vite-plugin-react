# rsc react-router

https://vite-rsc-react-router.hiro18181.workers.dev

> [!NOTE]
> React Router now provides [official RSC support](https://reactrouter.com/how-to/react-server-components) for Vite. The example might not be kept up to date with the latest version. Please refer to React Router's official documentation for the latest integrations.

Vite RSC example based on demo made by React router team with Parcel:

- https://github.com/jacob-ebey/parcel-plugin-react-router/
- https://github.com/jacob-ebey/experimental-parcel-react-router-starter
- https://github.com/remix-run/react-router/tree/rsc/playground/rsc-vite

See also [`rsc-movies`](https://github.com/hi-ogawa/rsc-movies/).

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
