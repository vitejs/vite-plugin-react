import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import {
  transformProxyExport,
  type TransformProxyExportOptions,
} from './proxy-export'

async function testTransform(
  input: string,
  options?: Partial<TransformProxyExportOptions>,
) {
  const ast = await parseAstAsync(input)
  const result = transformProxyExport(ast, {
    code: input,
    runtime: (name) => `$$proxy("<id>", ${JSON.stringify(name)})`,
    ...options,
  })
  return { ...result, output: result.output.toString() }
}

describe(transformProxyExport, () => {
  test('filter runs before validation', async () => {
    const input = `export const cached = async () => {}, objectValue = {}`
    const ast = await parseAstAsync(input)
    const options: TransformProxyExportOptions = {
      code: input,
      runtime: (name) => `$$proxy(${JSON.stringify(name)})`,
      rejectNonAsyncFunction: true,
      filter: (_name, meta) => meta.valueNode?.type !== 'ObjectExpression',
    }

    expect(() => transformProxyExport(ast, options)).not.toThrow()

    const invalidInput = `${input}, primitive = 0`
    const invalidAst = await parseAstAsync(invalidInput)
    expect(() =>
      transformProxyExport(invalidAst, { ...options, code: invalidInput }),
    ).toThrow('unsupported non async function')
  })

  test('filter classifies destructured bindings from their container', async () => {
    const input = `export const { cached } = { cached: async () => {} }`
    const result = await testTransform(input, {
      rejectNonAsyncFunction: true,
      filter: (_name, meta) => meta.valueNode?.type !== 'ObjectExpression',
    })

    // TODO: A destructured binding should have no `valueNode` because the
    // container is not its value. The filter should therefore conservatively
    // select `cached` without validating the object initializer, resulting in
    // `exportNames: ['cached']`.
    // https://github.com/vercel/next.js/tree/aae4179ac628e55483b62cd023a7e1827dcef122/crates/next-custom-transforms/tests/fixture/server-actions/client-graph/14
    expect(result.exportNames).toEqual([])
  })

  test.each([
    ['{}', undefined],
    ['[]', undefined],
    ['{}', () => true],
    ['[]', () => true],
  ])('validates empty binding %s with filter %s', async (id, filter) => {
    await expect(
      testTransform(`export const ${id} = ${id}`, {
        rejectNonAsyncFunction: true,
        filter,
      }),
    ).rejects.toThrow('unsupported non async function')
  })

  test('export string name throws', async () => {
    const input = `
const x = 0;
export { x as "my thing" }
`
    await expect(testTransform(input)).rejects.toThrow(
      'unsupported string literal export name',
    )
  })

  test('re-export all throws', async () => {
    await expect(testTransform(`export * from "./dep"`)).rejects.toThrow(
      'unsupported ExportAllDeclaration',
    )
  })

  test('filter with keep throws', async () => {
    await expect(
      testTransform(`export const action = () => {}`, {
        keep: true,
        filter: () => true,
      }),
    ).rejects.toThrow('`filter` option is not supported with `keep`')
  })
})
