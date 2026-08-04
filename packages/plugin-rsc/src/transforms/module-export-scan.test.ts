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

test('reports statically known source parameters', async () => {
  const ast = await parseAstAsync(`
export async function declared(value = 1, { nested }) {}
export const rest = async (value, ...remaining) => {}
async function local(value) {}
export { local as renamed }
export default local
export { remote } from './dep'
export const unknown = getValue()
`)

  const parameters = scanModuleExports(ast).flatMap((group) => {
    if (group.type === 'declaration') {
      return [[group.export.exportName, group.export.meta.parameters]] as const
    }
    if (group.type === 'variable-declaration') {
      return group.declarators.flatMap((declarator) =>
        declarator.exports.map(
          (entry) => [entry.exportName, entry.meta.parameters] as const,
        ),
      )
    }
    if (group.type === 'specifiers') {
      return group.exports.map(
        (entry) => [entry.exportName, entry.meta.parameters] as const,
      )
    }
    if (group.type === 'default') {
      return [['default', group.meta.parameters]] as const
    }
    return []
  })

  expect(new Map(parameters)).toEqual(
    new Map([
      ['declared', { count: 2, hasRest: false }],
      ['rest', { count: 2, hasRest: true }],
      ['renamed', { count: 1, hasRest: false }],
      ['default', { count: 1, hasRest: false }],
      ['remote', undefined],
      ['unknown', undefined],
    ]),
  )
})

test('omits parameters for reassigned function bindings', async () => {
  const ast = await parseAstAsync(`
export let direct = async (value) => {}
direct = async (value, extra) => {}

async function local(value) {}
local = async (value, extra) => {}
export { local as renamed }
export default local
`)

  const groups = scanModuleExports(ast)
  const [direct, renamed, defaultExport] = groups
  expect(direct?.type).toBe('variable-declaration')
  expect(renamed?.type).toBe('specifiers')
  expect(defaultExport?.type).toBe('default')
  if (
    direct?.type !== 'variable-declaration' ||
    renamed?.type !== 'specifiers' ||
    defaultExport?.type !== 'default'
  ) {
    throw new Error('unexpected export groups')
  }
  expect(direct.declarators[0]?.exports[0]?.meta.parameters).toBeUndefined()
  expect(renamed.exports[0]?.meta.parameters).toBeUndefined()
  expect(defaultExport.meta.parameters).toBeUndefined()
})

test('does not assign initializer parameters to destructured exports', async () => {
  const ast = await parseAstAsync(
    `export const { fn } = async (first, second) => {}`,
  )

  const [group] = scanModuleExports(ast)
  expect(group?.type).toBe('variable-declaration')
  if (group?.type !== 'variable-declaration') {
    throw new Error('unexpected export group')
  }
  expect(group.declarators[0]?.exports[0]?.meta.parameters).toBeUndefined()
})

test('omits parameters for module var rebinding', async () => {
  const ast = await parseAstAsync(`
var repeated = async (value) => {}
var repeated = async (value, extra) => {}
export { repeated }

var iterated = async (value) => {}
for (var iterated of source) {}
export { iterated }
`)

  const groups = scanModuleExports(ast).filter(
    (group) => group.type === 'specifiers',
  )
  expect(groups).toHaveLength(2)
  expect(groups[0]?.exports[0]?.meta.parameters).toBeUndefined()
  expect(groups[1]?.exports[0]?.meta.parameters).toBeUndefined()
})

test('omits parameters for assignments from default parameter scope', async () => {
  const ast = await parseAstAsync(`
const reassigned = async (value) => {}
function trigger(value = (reassigned = async (value, extra) => {})) {
  var reassigned
}
export { reassigned }

const stable = async (value) => {}
function shadow(stable = (stable = other)) {}
export { stable }
`)

  const groups = scanModuleExports(ast).filter(
    (group) => group.type === 'specifiers',
  )
  expect(groups).toHaveLength(2)
  expect(groups[0]?.exports[0]?.meta.parameters).toBeUndefined()
  expect(groups[1]?.exports[0]?.meta.parameters).toEqual({
    count: 1,
    hasRest: false,
  })
})
