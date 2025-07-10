import { writeFileSync } from 'node:fs'
import { defineConfig } from 'tsdown'
import packageJSON from './package.json' with { type: 'json' }

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm', 'cjs'],
  dts: true,
  tsconfig: './tsconfig.src.json', // https://github.com/sxzz/rolldown-plugin-dts/issues/55
  copy: [
    {
      from: 'node_modules/@vitejs/react-common/refresh-runtime.js',
      to: 'dist/refresh-runtime.js',
    },
    {
      from: 'LICENSE',
      to: 'dist/LICENSE',
    },
    {
      from: 'README.md',
      to: 'dist/README.md',
    },
  ],
  outputOptions(outputOpts, format) {
    if (format === 'cjs') {
      outputOpts.footer = (chunk) => {
        // don't append to dts files
        if (chunk.fileName.endsWith('.cjs')) {
          return 'module.exports.default = module.exports'
        }
        return ''
      }
    }
    return outputOpts
  },
  onSuccess() {
    writeFileSync(
      'dist/package.json',
      JSON.stringify(
        {
          ...Object.fromEntries(
            Object.entries(packageJSON).filter(
              ([key, _val]) =>
                key !== 'devDependencies' &&
                key !== 'scripts' &&
                key !== 'private',
            ),
          ),
          main: 'index.cjs',
          types: 'index.d.ts',
          module: 'index.js',
          exports: {
            '.': {
              require: './index.cjs',
              import: './index.js',
            },
          },
        },
        null,
        2,
      ),
    )
  },
})
