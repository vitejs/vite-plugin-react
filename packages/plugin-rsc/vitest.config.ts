import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          dir: './src',
          exclude: ['**/*.rsc.test.ts'],
        },
      },
      {
        // runs the plugin's rsc runtime against React's react-server build
        extends: true,
        resolve: {
          alias: {
            '@vitejs/plugin-rsc/vendor/react-server-dom/server.edge':
              'react-server-dom-webpack/server.edge',
          },
        },
        test: {
          name: 'rsc',
          dir: './src',
          include: ['**/*.rsc.test.ts'],
          execArgv: ['--conditions=react-server'],
        },
      },
    ],
  },
}) as any
