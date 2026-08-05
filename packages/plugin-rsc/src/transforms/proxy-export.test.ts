import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import { transformProxyExport } from './proxy-export'

async function testTransform(input: string) {
  const ast = await parseAstAsync(input)
  const result = transformProxyExport(ast, {
    code: input,
    runtime: (name) => `$$proxy("<id>", ${JSON.stringify(name)})`,
  })
  return { ...result, output: result.output.toString() }
}

describe(transformProxyExport, () => {
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
})
