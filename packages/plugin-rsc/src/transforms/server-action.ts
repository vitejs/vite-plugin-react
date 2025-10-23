import { transformHoistInlineDirective } from './hoist'
import { hasDirective } from './utils'
import { transformWrapExport } from './wrap-export'
import type { Program } from 'estree'
import type MagicString from 'magic-string'

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
):
  | {
      exportNames: string[]
      output: MagicString
    }
  | {
      output: MagicString
      names: string[]
    } {
  // TODO: unify (generalize transformHoistInlineDirective to support top leve directive case)
  if (hasDirective(ast.body, 'use server')) {
    return transformWrapExport(input, ast, options)
  }
  return transformHoistInlineDirective(input, ast, {
    ...options,
    directive: 'use server',
  })
}
