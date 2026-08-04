import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import {
  transformModuleExportEffect,
  type TransformModuleExportEffectContext,
  type TransformModuleExportEffectOptions,
} from './module-export-effect'

async function transform(
  input: string,
  options: Partial<TransformModuleExportEffectOptions> = {},
) {
  const ast = await parseAstAsync(input)
  return transformModuleExportEffect(input, ast, {
    generate: ({ binding }) => `register(${binding})`,
    ...options,
  })
}

function formatContext({
  binding,
  exportName,
}: TransformModuleExportEffectContext) {
  return { binding, exportName }
}

describe(transformModuleExportEffect, () => {
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
      { binding: 'action', exportName: 'action' },
      { binding: 'loader', exportName: 'loader' },
      { binding: 'local', exportName: 'renamed' },
      { binding: '$$effect_import_forwarded', exportName: 'forwarded' },
      { binding: 'Page', exportName: 'default' },
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
      { binding: 'selected', exportName: 'selected' },
    ])
    expect(result.referenceNames).toEqual(['selected'])
    expect(result.output.toString()).toMatchInlineSnapshot(`
      "const selected = async () => {}, skipped = async () => {}
      register(selected);
      export { selected, skipped };
      "
    `)

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

  test.each([
    ['literal', `export const action = 1`],
    ['object', `export const action = {}`],
    ['array', `export const action = []`],
    ['uninitialized variable', `export let action`],
  ])('rejects %s exports', async (_name, input) => {
    await expect(
      transform(input, { rejectNonAsyncFunction: true }),
    ).rejects.toThrow('unsupported non async function')
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

  test('runtime export meta', async () => {
    const examples: [input: string, expected: unknown[]][] = [
      [
        `export function Fn() {}`,
        [
          {
            declName: 'Fn',
            isFunction: true,
          },
        ],
      ],
      [
        `export class Cls {}`,
        [
          {
            declName: 'Cls',
            isFunction: false,
          },
        ],
      ],
      [
        `export const Arrow = () => {}`,
        [
          {
            declName: 'Arrow',
            isFunction: true,
          },
        ],
      ],
      [
        `export const FnExpression = function () {}`,
        [
          {
            declName: 'FnExpression',
            isFunction: true,
          },
        ],
      ],
      [
        `export const Literal = 1`,
        [
          {
            declName: 'Literal',
            isFunction: false,
          },
        ],
      ],
      [
        `export const ObjectValue = {}`,
        [
          {
            declName: 'ObjectValue',
            isFunction: false,
          },
        ],
      ],
      [
        `export const ArrayValue = []`,
        [
          {
            declName: 'ArrayValue',
            isFunction: false,
          },
        ],
      ],
      [
        `export const ClassValue = class {}`,
        [
          {
            declName: 'ClassValue',
            isFunction: false,
          },
        ],
      ],
      [`export const Unknown = getValue()`, [{ declName: 'Unknown' }]],
      [`export const { id } = getValue()`, [{ declName: 'id' }]],
      [`export const [a, b] = []`, [{ declName: 'a' }, { declName: 'b' }]],
      [
        `export const MultiFn = () => {}, MultiValue = 1, MultiUnknown = getValue()`,
        [
          {
            declName: 'MultiFn',
            isFunction: true,
          },
          {
            declName: 'MultiValue',
            isFunction: false,
          },
          { declName: 'MultiUnknown' },
        ],
      ],
      [
        `export default function Page() {}`,
        [
          {
            declName: 'Page',
            isFunction: true,
          },
        ],
      ],
      [`export default function () {}`, [{ isFunction: true }]],
      [
        `export default class Page {}`,
        [
          {
            declName: 'Page',
            isFunction: false,
          },
        ],
      ],
      [`export default class {}`, [{ isFunction: false }]],
      [`export default () => {}`, [{ isFunction: true }]],
      [`export default 1`, [{ isFunction: false }]],
      [
        `const Page = () => {}; export default Page`,
        [{ defaultExportIdentifierName: 'Page' }],
      ],
      [`const id = async () => {}; export { id }`, [{}]],
      [`export { id } from './dep'`, [{}]],
    ]

    for (const [input, expected] of examples) {
      const result = await transform(input)
      expect(
        result.references.map(({ meta: { valueNode: _, ...meta } }) => meta),
      ).toEqual(expected)
    }
  })
})
