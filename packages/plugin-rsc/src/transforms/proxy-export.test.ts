import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import {
  transformProxyExport,
  type TransformProxyExportOptions,
} from './proxy-export'
import { transformWrapExport } from './wrap-export'

async function testTransform(
  input: string,
  options?: Partial<TransformProxyExportOptions>,
) {
  const ast = await parseAstAsync(input)
  const result = transformProxyExport(ast, {
    code: input,
    runtime: (name, meta) => {
      if (meta?.value) {
        return `$$proxy(${meta.value}, "<id>", ${JSON.stringify(name)})`
      }
      return `$$proxy("<id>", ${JSON.stringify(name)})`
    },
    ...options,
  })
  return { ...result, output: result.output.toString() }
}

describe(transformWrapExport, () => {
  test('basic', async () => {
    const input = `
export const Arrow = () => {

};
export default "hi";
export function Fn() {
};

export async function AsyncFn() {


};

export class Cls {};
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      {
        "exportNames": [
          "Arrow",
          "default",
          "Fn",
          "AsyncFn",
          "Cls",
        ],
        "output": "
      export const Arrow = /* #__PURE__ */ $$proxy("<id>", "Arrow");

      export default /* #__PURE__ */ $$proxy("<id>", "default");

      export const Fn = /* #__PURE__ */ $$proxy("<id>", "Fn");


      export const AsyncFn = /* #__PURE__ */ $$proxy("<id>", "AsyncFn");


      export const Cls = /* #__PURE__ */ $$proxy("<id>", "Cls");

      ",
      }
    `)
  })

  test('export destructuring', async () => {
    const input = `
export const { x, y: [z] } = { x: 0, y: [1] };
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      {
        "exportNames": [
          "x",
          "z",
        ],
        "output": "
      export const x = /* #__PURE__ */ $$proxy("<id>", "x");
      export const z = /* #__PURE__ */ $$proxy("<id>", "z");

      ",
      }
    `)
  })

  test('filter value node', async () => {
    const input = `\
export const cached = async () => {}, metadata = {}, tags = []
export const unknown = createCached()
export const primitive = 0
`
    const result = await testTransform(input, {
      filter: (_name, meta) =>
        meta.valueNode?.type !== 'ObjectExpression' &&
        meta.valueNode?.type !== 'ArrayExpression',
    })

    expect(result.exportNames).toEqual(['cached', 'unknown', 'primitive'])
    expect(result.output).toMatchInlineSnapshot(`
      "export const cached = /* #__PURE__ */ $$proxy("<id>", "cached");

      export const unknown = /* #__PURE__ */ $$proxy("<id>", "unknown");

      export const primitive = /* #__PURE__ */ $$proxy("<id>", "primitive");

      "
    `)
  })

  test('filter runs before validation', async () => {
    const input = `export const cached = async () => {}, metadata = {}`
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

  test('filter treats destructured bindings as unknown', async () => {
    const input = `export const { cached } = { cached: async () => {} }`
    const ast = await parseAstAsync(input)
    const result = transformProxyExport(ast, {
      code: input,
      runtime: (name) => `$$proxy(${JSON.stringify(name)})`,
      rejectNonAsyncFunction: true,
      filter: (_name, meta) => meta.valueNode?.type !== 'ObjectExpression',
    })

    expect(result.exportNames).toEqual(['cached'])
  })

  test('default function', async () => {
    const input = `export default function Fn() {}`
    expect(await testTransform(input)).toMatchInlineSnapshot(
      `
      {
        "exportNames": [
          "default",
        ],
        "output": "export default /* #__PURE__ */ $$proxy("<id>", "default");
      ",
      }
    `,
    )
  })

  test('default anonymous function', async () => {
    const input = `export default function () {}`
    expect(await testTransform(input)).toMatchInlineSnapshot(
      `
      {
        "exportNames": [
          "default",
        ],
        "output": "export default /* #__PURE__ */ $$proxy("<id>", "default");
      ",
      }
    `,
    )
  })

  test('default class', async () => {
    const input = `export default class Cls {}`
    expect(await testTransform(input)).toMatchInlineSnapshot(
      `
      {
        "exportNames": [
          "default",
        ],
        "output": "export default /* #__PURE__ */ $$proxy("<id>", "default");
      ",
      }
    `,
    )
  })

  test('export simple', async () => {
    const input = `
const x = 0;
export { x }
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      {
        "exportNames": [
          "x",
        ],
        "output": "

      export const x = /* #__PURE__ */ $$proxy("<id>", "x");

      ",
      }
    `)
  })

  test('export rename', async () => {
    const input = `
const x = 0;
export { x as y }
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      {
        "exportNames": [
          "y",
        ],
        "output": "

      export const y = /* #__PURE__ */ $$proxy("<id>", "y");

      ",
      }
    `)
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

  test('re-export simple', async () => {
    const input = `export { x } from "./dep"`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      {
        "exportNames": [
          "x",
        ],
        "output": "export const x = /* #__PURE__ */ $$proxy("<id>", "x");
      ",
      }
    `)
  })

  test('re-export rename', async () => {
    const input = `export { x as y } from "./dep"`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      {
        "exportNames": [
          "y",
        ],
        "output": "export const y = /* #__PURE__ */ $$proxy("<id>", "y");
      ",
      }
    `)
  })

  test('re-export namespace', async () => {
    const input = `export * as all from "./dep"`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      {
        "exportNames": [
          "all",
        ],
        "output": "export const all = /* #__PURE__ */ $$proxy("<id>", "all");
      ",
      }
    `)
  })

  test('re-export all (ignoreExportAllDeclaration)', async () => {
    const input = `export * from "./dep"`
    expect(await testTransform(input, { ignoreExportAllDeclaration: true }))
      .toMatchInlineSnapshot(`
      {
        "exportNames": [],
        "output": "",
      }
    `)
  })

  test('re-export all (unresolved throws)', async () => {
    const input = `export * from "./dep"`
    await expect(testTransform(input)).rejects.toThrow(
      'unsupported ExportAllDeclaration',
    )
  })

  test('keep', async () => {
    // Waku must run its DCE before this transform. For example:
    //
    //   // user source
    //   export const countAtom = allowServer(atom(local1));
    //   export const MyClientComp = () => <div />;
    //
    //   // after Waku's DCE
    //   export const countAtom = atom(local1);
    //   export const MyClientComp = () => { throw new Error('...') };
    //
    //   // after this transform with `keep: true`
    //   export const countAtom = $$proxy(atom(local1), "<id>", "countAtom");
    //   export const MyClientComp = $$proxy(
    //     () => { throw new Error('...') }, "<id>", "MyClientComp"
    //   );
    //
    // The input below represents Waku's output. `keep` disables our normal DCE
    // so its retained imports, dependencies, and export initializers survive.
    const input = `\
"use client"
import { atom } from 'jotai/vanilla';

const local1 = 1;
export const countAtom = atom(local1);

export const MyClientComp = () => { throw new Error('...') }
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      {
        "exportNames": [
          "countAtom",
          "MyClientComp",
        ],
        "output": "



      export const countAtom = /* #__PURE__ */ $$proxy("<id>", "countAtom");


      export const MyClientComp = /* #__PURE__ */ $$proxy("<id>", "MyClientComp");

      ",
      }
    `)
    expect(await testTransform(input, { keep: true })).toMatchInlineSnapshot(`
      {
        "exportNames": [
          "countAtom",
          "MyClientComp",
        ],
        "output": ""use client"
      import { atom } from 'jotai/vanilla';

      const local1 = 1;
      export const countAtom = /* #__PURE__ */ $$proxy(atom(local1), "<id>", "countAtom");

      export const MyClientComp = /* #__PURE__ */ $$proxy(() => { throw new Error('...') }, "<id>", "MyClientComp");
      ",
      }
    `)
  })
})
