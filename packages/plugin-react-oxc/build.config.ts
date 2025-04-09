import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  externals: ['vite'],
  clean: true,
  declaration: true,
  rollup: {
    inlineDependencies: true,
  },
  replace: {
    'globalThis.__IS_BUILD__': 'true',
  },
})
