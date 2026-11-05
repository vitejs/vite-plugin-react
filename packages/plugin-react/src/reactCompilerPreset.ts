import { fileURLToPath } from 'node:url'
import type {
  ReactCompilerBabelPluginOptions,
  RolldownBabelPreset,
} from '#optionalTypes'

const babelPresetPath = fileURLToPath(
  new URL(
    import.meta.url.endsWith('.ts')
      ? './reactCompilerBabelPreset.ts'
      : './reactCompilerBabelPreset.js',
    import.meta.url,
  ),
)

export const defaultCodeFilter: RegExp =
  /forwardRef|memo|\b(?:[A-Z]|use[A-Z0-9])/

export const reactCompilerPreset = (
  options: ReactCompilerBabelPluginOptions = {},
): RolldownBabelPreset => ({
  // Refer to the preset by path instead of by function, so that it can be sent
  // to worker threads when `@rolldown/plugin-babel`'s `parallel` option is set.
  preset: [babelPresetPath, options],
  rolldown: {
    filter: {
      // should be lax than https://github.com/facebook/react/blob/9c0323e2cf9be543d6eaa44419598af56922603f/compiler/packages/babel-plugin-react-compiler/src/Entrypoint/Program.ts#L842-L863
      code:
        options.compilationMode === 'annotation'
          ? /['"]use memo['"]/
          : defaultCodeFilter,
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
