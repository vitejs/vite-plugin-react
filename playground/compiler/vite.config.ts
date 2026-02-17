import babel from '@rollup/plugin-babel'
import react from '@vitejs/plugin-react'
import { defineConfig, withFilter } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  server: { port: 8900 /* Should be unique */ },
  plugins: [
    {
      ...withFilter(
        babel({
          babelrc: false,
          configFile: false,
          plugins: [['babel-plugin-react-compiler', {}]],
          parserOpts: {
            sourceType: 'module',
            allowAwaitOutsideFunction: true,
          },
          overrides: [
            {
              test: '**/*.jsx',
              parserOpts: { plugins: ['jsx'] },
            },
            {
              test: '**/*.ts',
              parserOpts: { plugins: ['typescript'] },
            },
            {
              test: '**/*.tsx',
              parserOpts: { plugins: ['typescript', 'jsx'] },
            },
          ],

          extensions: ['.js', '.jsx', '.ts', '.tsx'],
          babelHelpers: 'bundled',
          skipPreflightCheck: true,
        }),
        {
          transform: {
            // use `/['"]use memo['"]/` instead for `compilationMode: "annotation"`
            code: /\b[A-Z]|\buse/,
            id: { exclude: /\/node_modules\// },
          },
        },
      ),
      config() {
        return {
          optimizeDeps: {
            include: ['react-compiler-runtime'],
          },
        }
      },
      applyToEnvironment(environment) {
        return environment.name === 'client'
      },
      enforce: 'pre',
    },
    react(),
  ],
})
