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
    export: {
      localName: 'action',
      exportName: 'action',
      meta: {
        declName: 'action',
        isFunction: true,
        valueNode: { type: 'FunctionDeclaration' },
      },
    },
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
              declName: 'loader',
              isFunction: true,
              valueNode: { type: 'ArrowFunctionExpression' },
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
              declName: 'value',
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
        exports: [
          {
            localName: 'item',
            exportName: 'item',
            meta: {
              declName: 'item',
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
  ['export default function action() {}', 'named-declaration'],
  ['export default action', 'identifier'],
  ['export default () => {}', 'other'],
] as const)('classifies %s', async (source, kind) => {
  const ast = await parseAstAsync(source)

  expect(scanModuleExports(ast)).toMatchObject([{ type: 'default', kind }])
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

test.each([
  ['async function action() {}; export { action }', 'FunctionDeclaration'],
  [
    'export { action as renamed }; async function action() {}',
    'FunctionDeclaration',
  ],
  [
    'const action = async () => {}; export { action }',
    'ArrowFunctionExpression',
  ],
  [
    'const action = async function () {}; export default action',
    'FunctionExpression',
  ],
  ['async function action() {}; export default action', 'FunctionDeclaration'],
] as const)('resolves the local function in %s', async (input, type) => {
  const groups = scanModuleExports(await parseAstAsync(input))
  const group = groups.find(
    (group) => group.type === 'specifiers' || group.type === 'default',
  )!
  const meta =
    group.type === 'specifiers'
      ? group.exports[0]!.meta
      : group.type === 'default'
        ? group.meta
        : undefined

  expect(meta?.resolvedValueNode?.type).toBe(type)
  if (group.type === 'specifiers') {
    expect(meta?.valueNode).toBeUndefined()
    expect(meta?.isFunction).toBeUndefined()
    expect(meta?.declName).toBeUndefined()
  } else {
    expect(meta?.valueNode).toMatchObject({
      type: 'Identifier',
      name: 'action',
    })
  }
})

test.each([
  "import { action } from './dep'; export { action }",
  "export { action } from './dep'",
  'let action = async () => {}; export { action }',
  'var action = async () => {}; export default action',
  'const action = makeAction(); export { action }',
  'const { action } = source; export { action }',
  'async function action() {}; action = makeAction(); export { action }',
  'async function action() {}; ({ action } = source); export { action }',
  'async function action() {}; for (action of source) {} export { action }',
  'async function action() {}; for (action in source) {} export { action }',
  'async function action() {}; action++; export { action }',
  'async function action() {}; action ||= makeAction(); export { action }',
  'async function action() {}; [action] = source; export { action }',
  'async function action() {}; function change() { action = makeAction() }; export { action }',
  'async function action() {}; function change(action) { action = makeAction() }; export { action }',
  'async function action() {}; export default action; action = makeAction()',
] as const)('leaves the local function unresolved in %s', async (input) => {
  const groups = scanModuleExports(await parseAstAsync(input))
  for (const group of groups) {
    if (group.type === 'specifiers') {
      expect(group.exports[0]!.meta.resolvedValueNode).toBeUndefined()
    } else if (group.type === 'default') {
      expect(group.meta.resolvedValueNode).toBeUndefined()
    }
  }
})

test('property writes do not change the local function binding', async () => {
  const groups = scanModuleExports(
    await parseAstAsync(`
const action = async () => {}
action.description = 'local function'
export { action }
`),
  )
  expect(groups).toMatchObject([
    {
      type: 'specifiers',
      exports: [
        { meta: { resolvedValueNode: { type: 'ArrowFunctionExpression' } } },
      ],
    },
  ])
})

test('aliases share the source node without changing declaration metadata', async () => {
  const groups = scanModuleExports(
    await parseAstAsync(`
export async function action() {}
export { action as first, action as second }
export default action
`),
  )
  const declaration = groups[0]!
  const aliases = groups[1]!
  const defaultExport = groups[2]!
  expect(declaration.type).toBe('declaration')
  expect(aliases.type).toBe('specifiers')
  expect(defaultExport.type).toBe('default')
  if (
    declaration.type !== 'declaration' ||
    aliases.type !== 'specifiers' ||
    defaultExport.type !== 'default'
  )
    throw new Error('unexpected export groups')
  const source = declaration.export.meta.valueNode
  expect(declaration.export.meta.resolvedValueNode).toBeUndefined()
  expect(aliases.exports.map(({ meta }) => meta.resolvedValueNode)).toEqual([
    source,
    source,
  ])
  expect(defaultExport.meta.resolvedValueNode).toBe(source)
})
