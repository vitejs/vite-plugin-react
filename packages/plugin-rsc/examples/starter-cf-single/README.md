# Vite + RSC + Cloudflare Workers

https://vite-rsc-starter.hiro18181.workers.dev

[examples/starter](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/starter) integrated with [`@cloudflare/vite-plugin`](https://github.com/cloudflare/workers-sdk/tree/main/packages/vite-plugin-cloudflare).

The difference from [examples/react-router](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/react-router) is that this doesn't require two Workers.

`rsc` is defined as the main Worker environment while `ssr` is defined as a child environment that is embedded in the same Worker.

```ts
cloudflare({
  viteEnvironment: {
    name: 'rsc',
    // Define `ssr` as a child environment so that it runs in the same Worker as the parent `rsc` environment
    childEnvironments: ['ssr'],
  },
}),
```

```sh
# run dev server
npm run dev

# build for production and preview
npm run build
npm run preview
npm run release
```
