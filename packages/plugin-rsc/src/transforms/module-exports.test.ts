import { parseAstAsync } from 'vite'
import { expect, test } from 'vitest'
import { scanModuleExports } from './module-exports'

test(scanModuleExports, async () => {
  const ast = await parseAstAsync(`
export async function action() {}
export const loader = async () => {}, value = 1
export const { item } = source
export { loader as renamed }
export { remote as reexported } from './dep'
export default action
export * from './all'
`)

  const groups = scanModuleExports(ast)

  expect(groups).toHaveLength(7)
  expect(groups[0]).toMatchObject({
    type: 'declaration',
    declaration: { type: 'FunctionDeclaration' },
    exports: [
      {
        localName: 'action',
        exportName: 'action',
        meta: {
          localName: 'action',
          declarationKind: 'function',
          isFunction: true,
        },
      },
    ],
  })
  expect(groups[1]).toMatchObject({
    type: 'variable-declaration',
    declaration: { kind: 'const' },
    declarators: [
      {
        exports: [
          {
            localName: 'loader',
            exportName: 'loader',
            meta: {
              localName: 'loader',
              declarationKind: 'const',
              isFunction: true,
            },
          },
        ],
      },
      {
        exports: [
          {
            localName: 'value',
            exportName: 'value',
            meta: {
              localName: 'value',
              declarationKind: 'const',
              isFunction: false,
            },
          },
        ],
      },
    ],
  })
  expect(groups[2]).toMatchObject({
    type: 'variable-declaration',
    declarators: [
      {
        exports: [
          {
            localName: 'item',
            exportName: 'item',
            meta: {
              localName: 'item',
              declarationKind: 'const',
              isFunction: undefined,
            },
          },
        ],
      },
    ],
  })
  expect(groups[3]).toMatchObject({
    type: 'specifiers',
    node: { source: null },
    exports: [{ localName: 'loader', exportName: 'renamed', meta: {} }],
  })
  expect(groups[4]).toMatchObject({
    type: 'specifiers',
    node: { source: { value: './dep' } },
    exports: [{ localName: 'remote', exportName: 'reexported', meta: {} }],
  })
  expect(groups[5]).toMatchObject({
    type: 'default',
    localName: undefined,
    meta: { defaultExportIdentifierName: 'action' },
  })
  expect(groups[6]).toMatchObject({ type: 'export-all' })
})

test('preserves string literal export names', async () => {
  const ast = await parseAstAsync(`export { local as "public name" }`)

  expect(scanModuleExports(ast)).toMatchObject([
    {
      type: 'specifiers',
      exports: [
        {
          localName: 'local',
          exportName: 'public name',
          node: { exported: { type: 'Literal' } },
        },
      ],
    },
  ])
})
