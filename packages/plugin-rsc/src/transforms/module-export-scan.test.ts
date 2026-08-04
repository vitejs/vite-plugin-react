import { parseAstAsync } from 'vite'
import { expect, test } from 'vitest'
import { scanModuleExports } from './module-export-scan'

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
    directFunction: {
      node: { type: 'FunctionDeclaration' },
      originalName: 'action',
    },
    exports: [
      {
        localName: 'action',
        exportName: 'action',
        meta: {
          localName: 'action',
          isFunction: true,
          valueNode: { type: 'FunctionDeclaration' },
        },
      },
    ],
  })
  expect(groups[1]).toMatchObject({
    type: 'variable-declaration',
    declaration: { kind: 'const' },
    declarators: [
      {
        directFunction: {
          node: { type: 'ArrowFunctionExpression' },
          originalName: 'loader',
        },
        exports: [
          {
            localName: 'loader',
            exportName: 'loader',
            meta: {
              localName: 'loader',
              isFunction: true,
              valueNode: { type: 'ArrowFunctionExpression' },
            },
          },
        ],
      },
      {
        directFunction: undefined,
        exports: [
          {
            localName: 'value',
            exportName: 'value',
            meta: {
              localName: 'value',
              isFunction: false,
              valueNode: { type: 'Literal' },
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
        directFunction: undefined,
        exports: [
          {
            localName: 'item',
            exportName: 'item',
            meta: {
              localName: 'item',
              isFunction: undefined,
              valueNode: { type: 'Identifier', name: 'source' },
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
    kind: 'identifier',
    localName: undefined,
    meta: {
      defaultExportIdentifierName: 'action',
      valueNode: { type: 'Identifier', name: 'action' },
    },
  })
  expect(groups[6]).toMatchObject({ type: 'export-all' })
})

test.each([
  [
    'export default function action() {}',
    'named-declaration',
    'FunctionDeclaration',
    'action',
  ],
  ['export default action', 'identifier', undefined, undefined],
  ['export default () => {}', 'other', 'ArrowFunctionExpression', 'default'],
] as const)(
  'classifies %s',
  async (source, kind, functionType, originalName) => {
    const ast = await parseAstAsync(source)

    expect(scanModuleExports(ast)).toMatchObject([
      {
        type: 'default',
        kind,
        directFunction: functionType
          ? { node: { type: functionType }, originalName }
          : undefined,
      },
    ])
  },
)

test('records explicit function expression names', async () => {
  const ast = await parseAstAsync(
    `export const action = function implementation() {}`,
  )

  expect(scanModuleExports(ast)).toMatchObject([
    {
      type: 'variable-declaration',
      declarators: [
        {
          directFunction: {
            node: { type: 'FunctionExpression' },
            originalName: 'implementation',
          },
        },
      ],
    },
  ])
})

test('flags string literal export names as unsupported', async () => {
  const ast = await parseAstAsync(`
export { local as "public name" }
export { "remote name" as remote } from './dep'
`)

  expect(scanModuleExports(ast)).toMatchObject([
    {
      type: 'specifiers',
      exports: [
        {
          localName: 'local',
          exportName: '__unsupported_string_export__',
          node: { exported: { type: 'Literal' } },
        },
      ],
    },
    {
      type: 'specifiers',
      exports: [
        {
          localName: '__unsupported_string_export__',
          exportName: 'remote',
          node: { local: { type: 'Literal' } },
        },
      ],
    },
  ])
})
