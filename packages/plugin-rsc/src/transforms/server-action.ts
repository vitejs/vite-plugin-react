import type { Literal, Program } from 'estree'
import type MagicString from 'magic-string'
import { transformHoistInlineDirective } from './hoist'
import {
  transformWrapExport,
  type TransformWrapExportOptions,
} from './wrap-export'

// TODO
// source map for `options.runtime` (registerServerReference) call
// needs to match original position.
export function transformServerActionServer(
  input: string,
  ast: Program,
  options: {
    runtime: (value: string, name: string) => string
    directive?: string | RegExp
    moduleDirective?: Literal
    moduleRuntime?: TransformWrapExportOptions['runtime']
    inlineRuntime?: Parameters<
      typeof transformHoistInlineDirective
    >[2]['runtime']
    filter?: TransformWrapExportOptions['filter']
    rejectNonAsyncFunction?: boolean
    rejectNonAsyncModule?: boolean
    encode?: (value: string) => string
    decode?: (value: string) => string
    preserveModuleDirective?: boolean
    detectUseServerModule?: boolean
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
  const useServerStatement =
    options.detectUseServerModule === false
      ? undefined
      : ast.body.find(
          (statement) =>
            statement.type === 'ExpressionStatement' &&
            statement.expression.type === 'Literal' &&
            statement.expression.value === 'use server',
        )
  const moduleDirective =
    options.moduleDirective ??
    (useServerStatement?.type === 'ExpressionStatement' &&
    useServerStatement.expression.type === 'Literal'
      ? useServerStatement.expression
      : undefined)

  // TODO: unify (generalize transformHoistInlineDirective to support top-level directive cases)
  if (moduleDirective?.type === 'Literal') {
    const result = transformWrapExport(input, ast, {
      runtime: options.moduleRuntime ?? options.runtime,
      filter: options.filter,
      rejectNonAsyncFunction:
        options.rejectNonAsyncModule ?? options.rejectNonAsyncFunction,
    })
    if (!options.preserveModuleDirective && options.moduleDirective) {
      result.output.overwrite(
        moduleDirective.start,
        moduleDirective.end,
        `/* ${JSON.stringify(moduleDirective.value)} */`,
      )
    }
    return result
  }
  return transformHoistInlineDirective(input, ast, {
    runtime: options.inlineRuntime ?? options.runtime,
    directive: options.directive ?? 'use server',
    rejectNonAsyncFunction: options.rejectNonAsyncFunction,
    encode: options.encode,
    decode: options.decode,
  })
}
