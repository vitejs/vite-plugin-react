import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import {
  transformModuleExportWrap,
  type TransformModuleExportWrapOptions,
} from './module-export-wrap'

async function transform(
  input: string,
  options: Omit<TransformModuleExportWrapOptions, 'runtime'> = {},
) {
  const ast = await parseAstAsync(input)
  return transformModuleExportWrap(input, ast, {
    ...options,
    runtime: ({ implementation, exportName }) =>
      `wrap(${implementation}, ${JSON.stringify(exportName)})`,
  })
}

describe(transformModuleExportWrap, () => {
  test('hoists direct functions and replaces their original value sites', async () => {
    const result = await transform(`
'use cache'
export async function action(value) {
  return value
}
export const first = async () => 1, second = first
export const named = async function inner() {
  return inner
}
export default async function Page() {
  return 'page'
}
`)
    const code = result.output.toString()

    await expect(parseAstAsync(code)).resolves.toBeDefined()
    expect(result.referenceNames).toEqual([
      'action',
      'first',
      'second',
      'named',
      'default',
    ])
    expect(code).toContain(
      'export const action = /* #__PURE__ */ wrap($$module_0_implementation_action, "action");',
    )
    expect(code).toContain(
      'const $$module_0_implementation_action = async function $$module_0_implementation_action(value)',
    )
    expect(code).toContain(
      'const first = /* #__PURE__ */ wrap($$module_1_implementation_first, "first"), second = first',
    )
    expect(code).toContain('export { first };')
    expect(code).toContain(
      'export const named = /* #__PURE__ */ wrap($$module_3_implementation_named, "named")',
    )
    expect(code).toContain(
      'const $$module_3_implementation_named = async function inner()',
    )
    expect(code).toContain('return inner')
    expect(code).toContain(
      'Object.defineProperty($$module_3_implementation_named, "name", { value: "inner" })',
    )
    expect(code).toContain(
      'const Page = /* #__PURE__ */ wrap($$module_4_implementation_Page, "default");\nexport default Page;',
    )
    expect(code).toContain(
      'const $$module_2_binding_second = /* #__PURE__ */ wrap(second, "second");',
    )
    expect(code.indexOf("'use cache'")).toBeLessThan(
      code.indexOf('const $$module_0_implementation_action'),
    )
    expect(code.indexOf('const $$module_0_implementation_action')).toBeLessThan(
      code.indexOf('wrap($$module_0_implementation_action'),
    )
  })

  test('wraps unresolved values at export boundaries', async () => {
    const result = await transform(
      `
const local = factory()
export { local as action }
let current = first
export default current
current = second
export { remote as loader } from './dep'
export const { item } = { item: 1 }
export * from './all'
`,
      { exportAll: 'preserve' },
    )
    const code = result.output.toString()

    await expect(parseAstAsync(code)).resolves.toBeDefined()
    expect(result.referenceNames).toEqual([
      'action',
      'default',
      'loader',
      'item',
    ])
    expect(result.references[3]!.meta).toEqual({
      localName: 'item',
      isFunction: false,
    })
    expect(code).toContain('const $$module_1_implementation_default = current')
    expect(
      code.indexOf('const $$module_1_implementation_default = current'),
    ).toBeLessThan(code.indexOf('current = second'))
    expect(code).toContain(
      'const $$module_0_binding_action = /* #__PURE__ */ wrap(local, "action");',
    )
    expect(code).toContain(
      'const $$module_1_binding_default = /* #__PURE__ */ wrap($$module_1_implementation_default, "default");',
    )
    expect(code).toContain(
      "import { remote as $$module_2_implementation_loader } from './dep';",
    )
    expect(code).toContain(
      'const $$module_3_binding_item = /* #__PURE__ */ wrap(item, "item");',
    )
    expect(code).toContain("export * from './all'")
    expect(code).not.toContain('export { local as action }')
    expect(code).not.toContain('export const { item }')
  })

  test('initializes implementations before wrappers and routes recursion through the wrapper', async () => {
    const input = `
export function recursive(depth) {
  if (depth > 0) return recursive(depth - 1)
  return recursive.marker
}
`
    const ast = await parseAstAsync(input)
    const result = transformModuleExportWrap(input, ast, {
      runtime: ({ implementation }) =>
        `Object.assign((...args) => ${implementation}(...args), { marker: "wrapped" })`,
    })

    const module = await import(
      `data:text/javascript,${encodeURIComponent(result.output.toString())}`
    )
    expect(module.recursive(1)).toBe('wrapped')
  })

  test('filters exports and validates selected functions', async () => {
    const result = await transform(
      `export const Page = async () => {}, value = 1\nexport * from './dep'`,
      {
        exportAll: 'preserve',
        filter: (_name, meta) => meta.isFunction !== false,
        rejectNonAsyncFunction: true,
      },
    )
    const code = result.output.toString()

    await expect(parseAstAsync(code)).resolves.toBeDefined()
    expect(result.referenceNames).toEqual(['Page'])
    expect(code).toContain('export const Page = /* #__PURE__ */ wrap(')
    expect(code).toContain('value = 1')
    expect(code).toContain("export * from './dep'")

    await expect(
      transform(`export function action() {}`, {
        rejectNonAsyncFunction: true,
      }),
    ).rejects.toThrow('unsupported non async function')
    await expect(transform(`export * from './dep'`)).rejects.toThrow(
      'unsupported ExportAllDeclaration',
    )

    const defaultClass = await transform(
      `export default (class Named { static value = 1 })`,
    )
    await expect(
      parseAstAsync(defaultClass.output.toString()),
    ).resolves.toBeDefined()
    expect(defaultClass.output.toString()).toContain(
      'const $$module_0_implementation_default = (class Named',
    )
  })
})
