import type MagicString from 'magic-string'
import type { ESTree } from 'vite'
import { transformHoistInlineDirective } from './hoist'
import { transformModuleExportEffect } from './module-export-effect'
import { hasDirective } from './utils'

export type TransformServerActionServerOptions = {
  runtime: (value: string, name: string) => string
  rejectNonAsyncFunction?: boolean
  encode?: (value: string) => string
  decode?: (value: string) => string
}

export type TransformServerActionServerResult =
  | {
      exportNames: string[]
      output: MagicString
      referenceNames: string[]
    }
  | {
      output: MagicString
      names: string[]
      referenceNames: string[]
    }

export function transformServerActionServer(
  input: string,
  ast: ESTree.Program,
  options: TransformServerActionServerOptions,
): TransformServerActionServerResult {
  // TODO: unify (generalize transformHoistInlineDirective to support top-level directive cases)
  if (hasDirective(ast.body, 'use server')) {
    const result = transformModuleExportEffect(input, ast, {
      rejectNonAsyncFunction: options.rejectNonAsyncFunction,
      generate: ({ binding, exportName }) =>
        options.runtime(binding, exportName),
    })
    return { ...result, exportNames: result.referenceNames }
  }
  const result = transformHoistInlineDirective(input, ast, {
    ...options,
    directive: 'use server',
  })
  return { ...result, referenceNames: result.names }
}
