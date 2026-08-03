import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import {
  transformModuleExportWrap,
  type TransformModuleExportWrapContext,
  type TransformModuleExportWrapOptions,
} from './module-export-wrap'

async function transform(
  input: string,
  options: Partial<TransformModuleExportWrapOptions> = {},
) {
  const ast = await parseAstAsync(input)
  return transformModuleExportWrap(input, ast, {
    generate: ({ implementation, exportName }) =>
      `wrap(${implementation}, ${JSON.stringify(exportName)})`,
    ...options,
  })
}

function formatContext({
  implementation,
  exportName,
}: TransformModuleExportWrapContext) {
  return { implementation, exportName }
}

describe(transformModuleExportWrap, () => {
  test('returns generated export contexts in order', async () => {
    const result = await transform(`\
export async function action() {}
export const loader = async () => {}
const local = async () => {}
export { local as renamed }
export { remote as forwarded } from './dep'
export default async function Page() {}
`)

    expect(result.references.map(formatContext)).toEqual([
      {
        implementation: '$$module_0_implementation_action',
        exportName: 'action',
      },
      {
        implementation: '$$module_1_implementation_loader',
        exportName: 'loader',
      },
      { implementation: 'local', exportName: 'renamed' },
      {
        implementation: '$$module_3_implementation_forwarded',
        exportName: 'forwarded',
      },
      {
        implementation: '$$module_4_implementation_Page',
        exportName: 'default',
      },
    ])
    expect(result.referenceNames).toEqual([
      'action',
      'loader',
      'renamed',
      'forwarded',
      'default',
    ])
  })

  test('filters generated and reported exports', async () => {
    const input = `export const selected = async () => {}, skipped = async () => {}`
    const result = await transform(input, {
      filter: (name) => name === 'selected',
    })

    expect(result.references.map(formatContext)).toEqual([
      {
        implementation: '$$module_0_implementation_selected',
        exportName: 'selected',
      },
    ])
    expect(result.referenceNames).toEqual(['selected'])

    const filtered = await transform(input, { filter: () => false })
    expect(filtered.output.hasChanged()).toBe(false)
    expect(filtered.references).toEqual([])
    expect(filtered.referenceNames).toEqual([])
  })

  test('only validates selected exports as async functions', async () => {
    const input = `export function action() {}`

    await expect(
      transform(input, { rejectNonAsyncFunction: true }),
    ).rejects.toThrow('unsupported non async function')

    const filtered = await transform(input, {
      rejectNonAsyncFunction: true,
      filter: () => false,
    })
    expect(filtered.output.hasChanged()).toBe(false)
    expect(filtered.references).toEqual([])
  })

  test('controls export-all preservation', async () => {
    const input = `export * from './dep'`

    await expect(transform(input)).rejects.toThrow(
      'unsupported ExportAllDeclaration',
    )

    const preserved = await transform(input, { exportAll: 'preserve' })
    expect(preserved.output.hasChanged()).toBe(false)
    expect(preserved.references).toEqual([])
  })

  test('rejects string literal export names', async () => {
    const input = `const value = 0; export { value as "my value" }`

    await expect(transform(input)).rejects.toMatchObject({
      message: 'unsupported string literal export name',
      pos: input.indexOf('"my value"'),
    })
  })
})
