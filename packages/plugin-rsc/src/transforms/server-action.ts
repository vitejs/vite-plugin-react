import type MagicString from 'magic-string'
import type { ESTree } from 'vite'
import { transformHoistInlineDirective } from './hoist'
import { hasDirective } from './utils'
import { transformWrapExport } from './wrap-export'

// TODO: Preserve the `runtime` call's original Server Function position for
// every module export and inline directive shape.
// https://github.com/vitejs/vite-plugin-react/issues/1361
export function transformServerActionServer(
  input: string,
  ast: ESTree.Program,
  options: {
    runtime: (value: string, name: string) => string
    rejectNonAsyncFunction?: boolean
    encode?: (value: string) => string
    decode?: (value: string) => string
  },
):
  | {
      exportNames: string[]
      output: MagicString
      referenceNames: string[]
    }
  | {
      output: MagicString
      names: string[]
      referenceNames: string[]
    } {
  // TODO: unify (generalize transformHoistInlineDirective to support top-level directive cases)
  if (hasDirective(ast.body, 'use server')) {
    const result = transformWrapExport(input, ast, options)
    return { ...result, referenceNames: result.exportNames }
  }
  const result = transformHoistInlineDirective(input, ast, {
    ...options,
    directive: 'use server',
  })
  return { ...result, referenceNames: result.names }
}
