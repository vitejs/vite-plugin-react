import { makeIdFiltersToMatchWithQuery } from '@rolldown/pluginutils'
import swc from '@rollup/plugin-swc'
import react from '@vitejs/plugin-react'
import { defineConfig, withFilter } from 'vite'

export default defineConfig({
  plugins: [
    ['tsx', 'ts', 'jsx', 'js'].map((ext) =>
      withFilter(
        {
          ...swc({
            swc: {
              swcrc: false,
              configFile: false,
              sourceMaps: true,
              jsc: {
                target: 'esnext',
                parser: {
                  syntax:
                    ext === 'tsx' || ext === 'ts' ? 'typescript' : 'ecmascript',
                  decorators: false,
                  jsx: ext === 'tsx' || ext === 'jsx',
                },
                experimental: {
                  plugins: [['@swc/plugin-emotion', {}]],
                },
                transform: {
                  useDefineForClassFields: true,
                  react: {
                    runtime: 'preserve',
                  },
                },
              },
            },
          }),
          enforce: 'pre',
        },
        {
          transform: {
            id: makeIdFiltersToMatchWithQuery(new RegExp(`\\.${ext}$`)),
          },
        },
      ),
    ),
    react({
      jsxImportSource: '@emotion/react',
    }),
  ],
})
