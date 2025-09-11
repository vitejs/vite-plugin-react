import rsc from '@vitejs/plugin-rsc'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
// import inspect from "vite-plugin-inspect";
// import { fontless } from 'fontless'

export default defineConfig({
  plugins: [
    // fontless({
    //   providers: {
    //     google: true,
    //   }
    // }),
    googleFontPlugin({
      urls: [
        'https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=block',
        'https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=block',
        'https://fonts.googleapis.com/css2?family=Inter&display=block',
        'https://fonts.googleapis.com/css2?family=Fira+Code&display=block',
      ],
    }),

    rsc({
      // `entries` option is only a shorthand for specifying each `rollupOptions.input` below
      // > entries: { rsc, ssr, client },
      //
      // by default, the plugin setup request handler based on `default export` of `rsc` environment `rollupOptions.input.index`.
      // This can be disabled when setting up own server handler e.g. `@cloudflare/vite-plugin`.
      // > serverHandler: false
    }),

    // use any of react plugins https://github.com/vitejs/vite-plugin-react
    // to enable client component HMR
    react(),

    // use https://github.com/antfu-collective/vite-plugin-inspect
    // to understand internal transforms required for RSC.
    // inspect(),
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

// https://nextjs.org/docs/app/api-reference/components/font
// https://nuxt.com/modules/fonts
// https://docs.astro.build/en/reference/experimental-flags/fonts/
function googleFontPlugin(googleFontPluginOptions: { urls: string[] }): Plugin {
  // dev
  // build
  // links

  // - parse css
  //   - extract font-face urls
  // - generate
  //   - concatenated css
  //   - preload links
  //     <link rel="preconnect" href="..." /> for font domains
  //     <link rel="preload" as="font" href="..." /> only for latin unicode range fonts U+0000-00FF

  async function fetchFontCss(url: string) {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(
        `Failed to fetch font css: ${url} - ${res.status} ${res.statusText}`,
      )
    }
    const css = await res.text()

    // https://github.com/vercel/next.js/blob/bdb12360376a6996d84cac06b7c3a2671232973a/crates/next-core/src/next_font/google/mod.rs#L526
    // extract "url(...)"

    // extract /* (subset) */

    // type
    return {
      css,
    }
  }

  // handle css urls
  // - fetch
  // - parse
  // - extract font urls
  // - generate css
  // - generate preload links

  async function handleCssUrls(urls: string[]) {
    // fetch font css files
    const texts = await Promise.all(
      urls.map(async (url) => {
        const res = await fetch(url)
        if (!res.ok) {
          throw new Error(
            `Failed to fetch font css: ${url} - ${res.status} ${res.statusText}`,
          )
        }
        const text = await res.text()
        return `/*** ${url} ***/\n` + text
      }),
    )
    // const ast = csstree.parse(texts.join("\n"))
    // csstree.walk(ast, {
    //   visit: 'Declaration',
    //   enter(node) {
    //     if (this.atrule?.name === 'font-face' && node.property === 'font-family') {
    //       // console.log(node.value.children);
    //     }
    //   }
    // })
    // const css = csstree.generate(ast);
    // console.log({ css })

    // extract url(...)
    // const urlMatches = css.matchAll(/url\(([^)]+)\)/g);
    // const fontUrls = [...new Set([...urlMatches].map(m => m[1]))]
    // console.log({ fontUrls })

    // preload "latin" subsets
  }

  return {
    name: 'waku-font',
    resolveId(source) {
      if (source.startsWith('virtual:waku-font')) {
        return '\0' + source
      }
    },
    async load(id) {
      if (id === '\0virtual:waku-font') {
        await handleCssUrls(googleFontPluginOptions.urls)
        return `\
import "virtual:waku-font.css";

export default function WakuFont() {
}
`
      }
      // TODO: why need "?direct"
      if (
        id === '\0virtual:waku-font.css' ||
        id === '\0virtual:waku-font.css?direct'
      ) {
        console.log({ id })
        return `\
body {
}        
`
      }
    },
  }
}
