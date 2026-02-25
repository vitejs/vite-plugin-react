import MagicString from 'magic-string'
import type { Plugin } from 'vite'

export default function vitePluginRscCore(): Plugin[] {
  return [
    {
      name: 'rsc:patch-react-server-dom-webpack',
      transform: {
        filter: { code: '__webpack_require__' },
        handler(code, id, _options) {
          if (!code.includes('__webpack_require__')) return

          // Use MagicString to perform replacements with a proper sourcemap,
          // so the Rollup sourcemap chain stays intact and doesn't emit
          // 'Can't resolve original location of error' warnings for every
          // file processed by this transform (e.g. all "use client" modules).
          const s = new MagicString(code)

          // Match `__webpack_require__.u` first (longer pattern), then bare
          // `__webpack_require__`, in a single left-to-right pass to avoid
          // overlapping overwrites into MagicString.
          const re = /__webpack_require__(?:\.u)?/g
          let match: RegExpExecArray | null
          while ((match = re.exec(code)) !== null) {
            const { index } = match
            if (match[0] === '__webpack_require__.u') {
              // avoid accessing `__webpack_require__` on import side effect
              // https://github.com/facebook/react/blob/a9bbe34622885ef5667d33236d580fe7321c0d8b/packages/react-server-dom-webpack/src/client/ReactFlightClientConfigBundlerWebpackBrowser.js#L16-L17
              s.overwrite(index, index + match[0].length, '({}).u')
            } else {
              // the existance of `__webpack_require__` global can break some packages
              // https://github.com/TooTallNate/node-bindings/blob/c8033dcfc04c34397384e23f7399a30e6c13830d/bindings.js#L90-L94
              s.overwrite(
                index,
                index + match[0].length,
                '__vite_rsc_require__',
              )
            }
          }

          if (s.hasChanged()) {
            return {
              code: s.toString(),
              map: s.generateMap({ hires: true, source: id }),
            }
          }
        },
      },
    },
    {
      // commonjsOptions needs to be tweaked when this is a linked dep
      // since otherwise vendored cjs doesn't work.
      name: 'rsc:workaround-linked-dep',
      apply: () => !import.meta.url.includes('/node_modules/'),
      configEnvironment() {
        return {
          build: {
            commonjsOptions: {
              include: [/\/node_modules\//, /\/vendor\/react-server-dom\//],
            },
          },
        }
      },
    },
  ]
}
