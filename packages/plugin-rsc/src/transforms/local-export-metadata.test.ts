import { parseAstAsync } from 'vite'
import type { ESTree } from 'vite'
import { describe, expect, test } from 'vitest'
import { transformModuleExportEffect } from './module-export-effect'
import type { ModuleExportMeta } from './module-export-scan'
import { validateNonAsyncFunction } from './utils'
import { transformWrapExport } from './wrap-export'

type Callback = (name: string, meta: ModuleExportMeta) => void
type Transform = (
  input: string,
  ast: ESTree.Program,
  callback: Callback,
  filter?: (name: string, meta: ModuleExportMeta) => boolean,
) => string

const transforms: [string, Transform][] = [
  [
    'module export effect',
    (input, ast, callback, filter) =>
      transformModuleExportEffect(input, ast, {
        filter,
        generate({ binding, exportName, meta }) {
          callback(exportName, meta)
          return `register(${binding}, ${JSON.stringify(exportName)})`
        },
      }).output.toString(),
  ],
  [
    'export wrapper',
    (input, ast, callback, filter) =>
      transformWrapExport(input, ast, {
        filter,
        runtime(value, name, meta) {
          callback(name, meta)
          return `wrap(${value}, ${JSON.stringify(name)})`
        },
      }).output.toString(),
  ],
]

describe.each(transforms)('%s local export metadata', (_name, transform) => {
  test('passes the original source through aliases and default identifiers', async () => {
    const input = `
export { action as first, action as second }
async function action() { return arguments[0] }
function unused() { return arguments[0] }
export default action
`
    const ast = await parseAstAsync(input)
    const references: [string, ModuleExportMeta][] = []
    transform(input, ast, (name, meta) => references.push([name, meta]))

    expect(references.map(([name]) => name)).toEqual([
      'first',
      'second',
      'default',
    ])
    const source = references[0]![1].resolvedValueNode
    expect(source).toBe(ast.body[1])
    expect(source).toMatchObject({ type: 'FunctionDeclaration', async: true })
    expect(
      references.every(([, meta]) => meta.resolvedValueNode === source),
    ).toBe(true)
    expect(references[0]![1].valueNode).toBeUndefined()
    expect(references[2]![1].valueNode).toMatchObject({ type: 'Identifier' })
  })

  test('preserves filtering by the existing metadata fields', async () => {
    const input = `
export async function direct() {}
export { local as alias }
const local = async () => {}
export default local
`
    const names: string[] = []
    const output = transform(
      input,
      await parseAstAsync(input),
      (name) => names.push(name),
      (_name, meta) => meta.isFunction === true,
    )
    expect(names).toEqual(['direct'])
    expect(output).toContain('export { local as alias }')
    expect(output).toContain('export default local')
  })

  test('lets the caller validate a resolved function without enforcing policy in the transform', async () => {
    const input = `function action() {}; export { action }`
    const ast = await parseAstAsync(input)
    expect(() => transform(input, ast, () => {})).not.toThrow()
    expect(() =>
      transform(input, ast, (_name, meta) => {
        const source = meta.resolvedValueNode ?? meta.valueNode
        if (source)
          validateNonAsyncFunction({ rejectNonAsyncFunction: true }, source)
      }),
    ).toThrow('unsupported non async function')
  })
})
