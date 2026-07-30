import type MagicString from 'magic-string'
import type { ESTree } from 'vite'
import { transformHoistInlineDirective } from './hoist'
import { transformModuleExport } from './module-export'
import { hasDirective } from './utils'

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
    const result = transformModuleExport(input, ast, {
      rejectNonAsyncFunction: options.rejectNonAsyncFunction,
      generate: ({ implementation, binding, exportName }) => {
        const declaration =
          `const ${binding} = /* #__PURE__ */ ` +
          `${options.runtime(implementation, exportName)};`
        return binding === exportName
          ? `export ${declaration}`
          : `${declaration}\nexport { ${binding} as ${exportName} };`
      },
    })
    return { ...result, exportNames: result.referenceNames }
  }
  const result = transformHoistInlineDirective(input, ast, {
    ...options,
    directive: 'use server',
  })
  return { ...result, referenceNames: result.names }
}
