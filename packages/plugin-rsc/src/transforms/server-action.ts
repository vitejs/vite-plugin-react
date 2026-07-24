import type { Program } from 'estree'
import type MagicString from 'magic-string'
import { transformHoistInlineDirective } from './hoist'
import { hasDirective } from './utils'
import { transformWrapExport } from './wrap-export'

// TODO
// source map for `options.runtime` (registerServerReference) call
// needs to match original position.
export function transformServerActionServer(
  input: string,
  ast: Program,
  options: {
    runtime: (value: string, name: string) => string
    rejectNonAsyncFunction?: boolean
    encode?: (value: string) => string
    decode?: (value: string) => string
  },
): {
  output: MagicString
  referenceNames: string[]
} {
  // TODO: unify (generalize transformHoistInlineDirective to support top-level directive cases)
  if (hasDirective(ast.body, 'use server')) {
    const { output, exportNames } = transformWrapExport(input, ast, options)
    return { output, referenceNames: exportNames }
  }
  const { output, names } = transformHoistInlineDirective(input, ast, {
    ...options,
    directive: 'use server',
  })
  return { output, referenceNames: names }
}
