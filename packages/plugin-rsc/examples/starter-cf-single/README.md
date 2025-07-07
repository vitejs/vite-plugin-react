# Vite + RSC + Cloudflare Workers

https://vite-rsc-starter.hiro18181.workers.dev

[examples/starter](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/starter) integrated with [`@cloudflare/vite-plugin`](https://github.com/cloudflare/workers-sdk/tree/main/packages/vite-plugin-cloudflare).

The difference from [examples/react-router](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/react-router) is that this doesn't require two workers.

- RSC environment always runs on Cloudflare Workers.
- During development, SSR environment runs as Vite's deafult Node environment.
- During production, SSR environment build output is directly imported into RSC environment build and both codes run on the same worker.

Such communication mechanism is enabled via `rsc({ loadModuleDevProxy: true })` plugin option.

```sh
# run dev server
npm run dev

# build for production and preview
npm run build
npm run preview
npm run release
```
