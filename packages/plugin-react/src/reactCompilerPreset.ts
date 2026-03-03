import type {
  ReactCompilerBabelPluginOptions,
  RolldownBabelPreset,
} from '#optionalTypes'

export const reactCompilerPreset = (
  options: Pick<
    ReactCompilerBabelPluginOptions,
    'compilationMode' | 'target'
  > = {},
): RolldownBabelPreset => ({
  preset: () => ({
    plugins: [['babel-plugin-react-compiler', options]],
  }),
  rolldown: {
    filter: {
      code:
        options.compilationMode === 'annotation'
          ? /['"]use memo['"]/
          : /\b[A-Z]|\buse/,
    },
    applyToEnvironmentHook: (env) => env.config.consumer === 'client',
    optimizeDeps: {
      include:
        options.target === '17' || options.target === '18'
          ? ['react-compiler-runtime']
          : ['react/compiler-runtime'],
    },
  },
})
