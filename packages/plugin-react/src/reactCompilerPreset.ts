import type {
  ReactCompilerBabelPluginOptions,
  RolldownBabelPreset,
} from '#optionalTypes'

export const reactCompilerPreset = (
  options: ReactCompilerBabelPluginOptions = {},
): RolldownBabelPreset => ({
  preset: () => ({
    plugins: [['babel-plugin-react-compiler', options]],
  }),
  rolldown: {
    filter: {
      // should be lax than https://github.com/facebook/react/blob/9c0323e2cf9be543d6eaa44419598af56922603f/compiler/packages/babel-plugin-react-compiler/src/Entrypoint/Program.ts#L842-L863
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
