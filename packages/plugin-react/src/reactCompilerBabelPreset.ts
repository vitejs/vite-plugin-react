import { fileURLToPath } from 'node:url'
import type { ReactCompilerBabelPluginOptions } from '#optionalTypes'

// Babel loads this preset by its file path (see `reactCompilerPreset`), so that
// `@rolldown/plugin-babel` can send it to worker threads when `parallel` is set.
export default function reactCompilerBabelPreset(
  _api: unknown,
  options: ReactCompilerBabelPluginOptions = {},
): { plugins: [string, ReactCompilerBabelPluginOptions][] } {
  return {
    plugins: [
      [
        fileURLToPath(import.meta.resolve('babel-plugin-react-compiler')),
        options,
      ],
    ],
  }
}
