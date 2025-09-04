import rsc from '@vitejs/plugin-rsc'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
// import inspect from "vite-plugin-inspect";

export default defineConfig({
  plugins: [
    rsc({
      // `entries` option is only a shorthand for specifying each `rollupOptions.input` below
      // > entries: { rsc, ssr, client },
      //
      // by default, the plugin setup request handler based on `default export` of `rsc` environment `rollupOptions.input.index`.
      // This can be disabled when setting up own server handler e.g. `@cloudflare/vite-plugin`.
      // > serverHandler: false
      serverHandler: false,
    }),

    // use any of react plugins https://github.com/vitejs/vite-plugin-react
    // to enable client component HMR
    react(),

    // use https://github.com/antfu-collective/vite-plugin-inspect
    // to understand internal transforms required for RSC.
    // inspect(),

    {
      name: 'middleware-mode-helper',
      configureServer(server) {
        ;(globalThis as any).__viteDevServer = server
      },
      resolveId(source) {
        if (source.startsWith('virtual:middleware-mode/')) {
          return '\0' + source
        }
      },
      load(id) {
        if (id === '\0virtual:middleware-mode/handler') {
          this.environment.mode === 'dev'
          return `\
import connect from 'connect'
import { createRequestListener } from '@remix-run/node-fetch-server'
import handler from "/src/framework/entry.rsc";

const app = connect();

const listener = createRequestListener(handler);

app.use
app.use(async (req, res, next) => {
  try {
    await listner(req, res);
  } catch (e) {
    next(e);
  }
});

export default app;
`
        }
      },
    },
  ],

  // specify entry point for each environment.
  // (currently the plugin assumes `rollupOptions.input.index` for some features.)
  environments: {
    // `rsc` environment loads modules with `react-server` condition.
    // this environment is responsible for:
    // - RSC stream serialization (React VDOM -> RSC stream)
    // - server functions handling
    rsc: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.rsc.tsx',
            main: './src/framework/main.ts',
          },
        },
      },
    },

    // `ssr` environment loads modules without `react-server` condition.
    // this environment is responsible for:
    // - RSC stream deserialization (RSC stream -> React VDOM)
    // - traditional SSR (React VDOM -> HTML string/stream)
    ssr: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.ssr.tsx',
          },
        },
      },
    },

    // client environment is used for hydration and client-side rendering
    // this environment is responsible for:
    // - RSC stream deserialization (RSC stream -> React VDOM)
    // - traditional CSR (React VDOM -> Browser DOM tree mount/hydration)
    // - refetch and re-render RSC
    // - calling server functions
    client: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.browser.tsx',
          },
        },
      },
    },
  },
})
