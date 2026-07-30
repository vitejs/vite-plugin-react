import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import {
  transformModuleExport,
  type TransformModuleExportOptions,
} from './module-export'

async function transform(
  input: string,
  options: Omit<TransformModuleExportOptions, 'generate'> = {},
) {
  const ast = await parseAstAsync(input)
  return transformModuleExport(input, ast, {
    ...options,
    generate: ({ implementation, binding, exportName }) =>
      `const ${binding} = wrap(${implementation}, ${JSON.stringify(exportName)});\n` +
      `export { ${binding} as ${exportName} };`,
  })
}

describe(transformModuleExport, () => {
  test('extracts direct and default declarations', async () => {
    const result = await transform(`
export async function action() {}
export const loader = async () => {}, value = 1
export default async function Page() {}
`)

    expect(result.referenceNames).toEqual([
      'action',
      'loader',
      'value',
      'default',
    ])
    expect(result.output.toString()).toMatchInlineSnapshot(`
      "
      async function action$$impl() {}
      const action = wrap(action$$impl, "action");
      export { action as action };

      const loader$$impl = async () => {}, value$$impl = 1
      const loader = wrap(loader$$impl, "loader");
      export { loader as loader };
      const value = wrap(value$$impl, "value");
      export { value as value };

      async function Page$$impl() {}
      const Page = wrap(Page$$impl, "default");
      export { Page as default };

      "
    `)
  })

  test('documents dependent multi-declarator TDZ', async () => {
    const result = await transform(
      `export const first = async () => {}, second = first`,
    )

    // `first` is a later generated const in this output. Supporting this
    // uncommon dependency would require splitting the source declaration.
    expect(result.output.toString()).toMatchInlineSnapshot(`
      "const first$$impl = async () => {}, second$$impl = first
      const first = wrap(first$$impl, \"first\");
      export { first as first };
      const second = wrap(second$$impl, \"second\");
      export { second as second };
      "
    `)
  })

  test('handles aliases, re-exports, filtering, and name collisions', async () => {
    const result = await transform(
      `
export { value as action, exposed as skipped }
const value = async () => {}
const exposed = 0
export { remote as action2 } from './dep'
export * from './other'
`,
      {
        exportAll: 'preserve',
        filter: (name) => name !== 'skipped',
      },
    )

    expect(result.referenceNames).toEqual(['action', 'action2'])
    expect(result.output.toString()).toMatchInlineSnapshot(`
      "

      export { exposed as skipped };

      const value = async () => {}
      const exposed = 0

      import { remote as $$import_remote } from './dep';
      const $$module_action2 = wrap($$import_remote, "action2");
      export { $$module_action2 as action2 };

      export * from './other'

      const $$module_action = wrap(value, "action");
      export { $$module_action as action };
      "
    `)
  })

  test('reports metadata and preserves filtered declarations', async () => {
    const input = `export const Page = () => {}, value = 1;
export default Page;`
    const ast = await parseAstAsync(input)
    const result = transformModuleExport(input, ast, {
      filter: (_name, meta) => meta.isFunction !== false,
      exportAll: 'preserve',
      generate: (context) =>
        `const ${context.binding} = wrap(${context.implementation}); export { ${context.binding} as ${context.exportName} };`,
    })

    expect({
      references: result.references,
      output: result.output.toString(),
    }).toMatchInlineSnapshot(`
      {
        "output": "const Page$$impl = () => {}, value = 1;
      const Page = wrap(Page$$impl); export { Page as Page };
      export { value };


      const $$default = wrap(Page); export { $$default as default };
      ",
        "references": [
          {
            "binding": "Page",
            "exportName": "Page",
            "implementation": "Page$$impl",
            "meta": {
              "declarationKind": "const",
              "isFunction": true,
              "localName": "Page",
            },
          },
          {
            "binding": "$$default",
            "exportName": "default",
            "implementation": "Page",
            "meta": {
              "defaultExportIdentifierName": "Page",
              "isFunction": undefined,
            },
          },
        ],
      }
    `)
  })

  test('validates selected exports and export-all policy', async () => {
    await expect(
      transform(`export function action() {}`, {
        rejectNonAsyncFunction: true,
      }),
    ).rejects.toThrow('unsupported non async function')
    await expect(transform(`export * from './dep'`)).rejects.toThrow(
      'unsupported ExportAllDeclaration',
    )
    await expect(transform(`export const { action } = value`)).rejects.toThrow(
      'unsupported destructured export declaration',
    )
    await expect(
      transform(`export var action = async () => {}; var action;`),
    ).rejects.toThrow('unsupported mutable export declaration')
    await expect(
      transform(`export let action = async () => {}`),
    ).rejects.toThrow('unsupported mutable export declaration')
  })
})
