import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import { debugSourceMap } from './test-utils'
import {
  type TransformWrapExportOptions,
  transformWrapExport,
} from './wrap-export'

async function testTransform(
  input: string,
  options?: Omit<TransformWrapExportOptions, 'runtime'>,
) {
  const ast = await parseAstAsync(input)
  const { output } = transformWrapExport(input, ast, {
    runtime: (value, name) =>
      `$$wrap(${value}, "<id>", ${JSON.stringify(name)})`,
    ignoreExportAllDeclaration: true,
    ...options,
  })
  if (process.env['DEBUG_SOURCEMAP']) {
    await debugSourceMap(output)
  }
  return output.hasChanged() && output.toString()
}

async function testTransformNames(input: string) {
  const ast = await parseAstAsync(input)
  const result = transformWrapExport(input, ast, {
    runtime: (value, name) =>
      `$$wrap(${value}, "<id>", ${JSON.stringify(name)})`,
    ignoreExportAllDeclaration: true,
  })
  return result.exportNames
}

describe(transformWrapExport, () => {
  test('basic', async () => {
    const input = `
export const Arrow = () => {};
export default "hi";
export function Fn() {};
export async function AsyncFn() {};
export class Cls {};
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      let Arrow = () => {};
      const $$default = "hi";
      function Fn() {};
      async function AsyncFn() {};
      class Cls {};
      Arrow = /* #__PURE__ */ $$wrap(Arrow, "<id>", "Arrow");
      export { Arrow };
      Fn = /* #__PURE__ */ $$wrap(Fn, "<id>", "Fn");
      export { Fn };
      AsyncFn = /* #__PURE__ */ $$wrap(AsyncFn, "<id>", "AsyncFn");
      export { AsyncFn };
      Cls = /* #__PURE__ */ $$wrap(Cls, "<id>", "Cls");
      export { Cls };
      ;
      const $$wrap_$$default = /* #__PURE__ */ $$wrap($$default, "<id>", "default");
      export { $$wrap_$$default as default };
      "
    `)

    expect(await testTransformNames(input)).toMatchInlineSnapshot(`
      [
        "Arrow",
        "default",
        "Fn",
        "AsyncFn",
        "Cls",
      ]
    `)
  })

  test('preserve reference', async () => {
    const input = `
export let count = 0;
export function changeCount() {
  count += 1;
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      let count = 0;
      function changeCount() {
        count += 1;
      }
      count = /* #__PURE__ */ $$wrap(count, "<id>", "count");
      export { count };
      changeCount = /* #__PURE__ */ $$wrap(changeCount, "<id>", "changeCount");
      export { changeCount };
      "
    `)
  })

  test('export destructuring', async () => {
    const input = `
export const { x, y: [z] } = { x: 0, y: [1] };
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      let { x, y: [z] } = { x: 0, y: [1] };
      x = /* #__PURE__ */ $$wrap(x, "<id>", "x");
      export { x };
      z = /* #__PURE__ */ $$wrap(z, "<id>", "z");
      export { z };
      "
    `)
  })

  test('default function', async () => {
    const input = `export default function Fn() {}`
    expect(await testTransform(input)).toMatchInlineSnapshot(
      `
      "function Fn() {};
      const $$wrap_Fn = /* #__PURE__ */ $$wrap(Fn, "<id>", "default");
      export { $$wrap_Fn as default };
      "
    `,
    )
  })

  test('default anonymous function', async () => {
    const input = `export default function () {}`
    expect(await testTransform(input)).toMatchInlineSnapshot(
      `
      "const $$default = function () {};
      const $$wrap_$$default = /* #__PURE__ */ $$wrap($$default, "<id>", "default");
      export { $$wrap_$$default as default };
      "
    `,
    )
  })

  test('default class', async () => {
    const input = `export default class Cls {}`
    expect(await testTransform(input)).toMatchInlineSnapshot(
      `
      "class Cls {};
      const $$wrap_Cls = /* #__PURE__ */ $$wrap(Cls, "<id>", "default");
      export { $$wrap_Cls as default };
      "
    `,
    )
  })

  test('export simple', async () => {
    const input = `
const x = 0;
export { x }
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      const x = 0;

      ;
      const $$wrap_x = /* #__PURE__ */ $$wrap(x, "<id>", "x");
      export { $$wrap_x as x };
      "
    `)
  })

  test('export rename', async () => {
    const input = `
const x = 0;
export { x as y }
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      const x = 0;

      ;
      const $$wrap_x = /* #__PURE__ */ $$wrap(x, "<id>", "y");
      export { $$wrap_x as y };
      "
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
      ";
      import { x as $$import_x } from "./dep";
      const $$wrap_$$import_x = /* #__PURE__ */ $$wrap($$import_x, "<id>", "x");
      export { $$wrap_$$import_x as x };
      "
    `)
  })

  test('re-export rename', async () => {
    const input = `export { x as y } from "./dep"`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      ";
      import { x as $$import_x } from "./dep";
      const $$wrap_$$import_x = /* #__PURE__ */ $$wrap($$import_x, "<id>", "y");
      export { $$wrap_$$import_x as y };
      "
    `)
  })

  test('re-export all simple', async () => {
    const input = `export * from "./dep"`
    expect(await testTransform(input)).toMatchInlineSnapshot(`false`)
  })

  test('re-export all rename', async () => {
    const input = `export * as all from "./dep"`
    expect(await testTransform(input)).toMatchInlineSnapshot(`false`)
  })

  test('filter', async () => {
    const input = `
export const a = 0;
export const b = 0, b_no = 0;
export { c } from "./c";
export { a as aa };
`
    const result = await testTransform(input, {
      filter: (name) => !name.endsWith('no'),
    })
    expect(result).toMatchInlineSnapshot(`
      "
      let a = 0;
      let b = 0, b_no = 0;


      a = /* #__PURE__ */ $$wrap(a, "<id>", "a");
      export { a };
      b = /* #__PURE__ */ $$wrap(b, "<id>", "b");
      export { b };
      export { b_no };
      ;
      import { c as $$import_c } from "./c";
      const $$wrap_$$import_c = /* #__PURE__ */ $$wrap($$import_c, "<id>", "c");
      export { $$wrap_$$import_c as c };
      const $$wrap_a = /* #__PURE__ */ $$wrap(a, "<id>", "aa");
      export { $$wrap_a as aa };
      "
    `)
  })

  test('filter meta', async () => {
    const input = `
export const a = 0;
export const b = function() {}
export const c = () => {}
export default function d() {}
`
    const result = await testTransform(input, {
      filter: (_name, meta) => !!(meta.isFunction && meta.declName),
    })
    expect(result).toMatchInlineSnapshot(`
      "
      let a = 0;
      let b = function() {}
      let c = () => {}
      function d() {}
      export { a };
      b = /* #__PURE__ */ $$wrap(b, "<id>", "b");
      export { b };
      c = /* #__PURE__ */ $$wrap(c, "<id>", "c");
      export { c };
      ;
      const $$wrap_d = /* #__PURE__ */ $$wrap(d, "<id>", "default");
      export { $$wrap_d as default };
      "
    `)
  })

  test('filter meta 2', async () => {
    const input = `
export default () => {}
`
    const result = await testTransform(input, {
      filter: (_name, meta) => !!(meta.isFunction && meta.declName),
    })
    expect(result).toMatchInlineSnapshot(`
      "
      const $$default = () => {}
      ;
      export { $$default as default };
      "
    `)
  })

  test('filter defaultExportIdentifierName', async () => {
    const input = `
const Page = () => {}
export default Page;
`
    expect(
      await testTransform(input, {
        filter: (_name, meta) => meta.defaultExportIdentifierName === 'Page',
      }),
    ).toMatchInlineSnapshot(`
      "
      const Page = () => {}
      const $$default = Page;
      ;
      const $$wrap_$$default = /* #__PURE__ */ $$wrap($$default, "<id>", "default");
      export { $$wrap_$$default as default };
      "
    `)
  })

  test('filtered exports are not validated or reported', async () => {
    const input = `
export const revalidate = 1;
export default async function Page() {}
`
    const ast = await parseAstAsync(input)
    const result = transformWrapExport(input, ast, {
      runtime: (value, name) => `$$wrap(${value}, ${JSON.stringify(name)})`,
      rejectNonAsyncFunction: true,
      filter: (name) => name !== 'revalidate',
    })
    expect(result.exportNames).toEqual(['default'])
    expect(result.output.toString()).toMatchInlineSnapshot(`
      "
      let revalidate = 1;
      async function Page() {}
      export { revalidate };
      ;
      const $$wrap_Page = /* #__PURE__ */ $$wrap(Page, "default");
      export { $$wrap_Page as default };
      "
    `)
  })

  test('filtered default exports are not validated or reported', async () => {
    const input = `export default 1;`
    const ast = await parseAstAsync(input)
    const result = transformWrapExport(input, ast, {
      runtime: (value, name) => `$$wrap(${value}, ${JSON.stringify(name)})`,
      rejectNonAsyncFunction: true,
      filter: () => false,
    })
    expect(result.exportNames).toEqual([])
    expect(result.output.toString()).toMatchInlineSnapshot(`
      "const $$default = 1;;
      export { $$default as default };
      "
    `)
  })

  test('unknown identifier exports remain eligible for wrapping', async () => {
    const input = `
const cached = async () => 1;
export default cached;
`
    const ast = await parseAstAsync(input)
    const result = transformWrapExport(input, ast, {
      runtime: (value, name) => `$$wrap(${value}, ${JSON.stringify(name)})`,
      filter: (_name, meta) => meta.isFunction !== false,
    })
    expect(result.exportNames).toEqual(['default'])
    expect(result.output.toString()).toMatchInlineSnapshot(`
      "
      const cached = async () => 1;
      const $$default = cached;
      ;
      const $$wrap_$$default = /* #__PURE__ */ $$wrap($$default, "default");
      export { $$wrap_$$default as default };
      "
    `)
  })

  test('runtime export meta', async () => {
    const examples: [input: string, expected: unknown[]][] = [
      [`export function Fn() {}`, [{ isFunction: true, declName: 'Fn' }]],
      [`export class Cls {}`, [{ isFunction: true, declName: 'Cls' }]],
      [
        `export const Arrow = () => {}`,
        [{ isFunction: true, declName: 'Arrow' }],
      ],
      [
        `export const FnExpression = function () {}`,
        [{ isFunction: true, declName: 'FnExpression' }],
      ],
      [
        `export const Literal = 1`,
        [{ isFunction: false, declName: 'Literal' }],
      ],
      [
        `export const ObjectValue = {}`,
        [{ isFunction: false, declName: 'ObjectValue' }],
      ],
      [
        `export const ArrayValue = []`,
        [{ isFunction: false, declName: 'ArrayValue' }],
      ],
      [
        `export const ClassValue = class {}`,
        [{ isFunction: false, declName: 'ClassValue' }],
      ],
      [
        `export const Unknown = getValue()`,
        [{ isFunction: undefined, declName: 'Unknown' }],
      ],
      [
        `export const MultiFn = () => {}, MultiValue = 1`,
        // TODO: Classify each declarator independently.
        [
          { isFunction: undefined, declName: 'MultiFn' },
          { isFunction: undefined, declName: 'MultiValue' },
        ],
      ],
      [
        `export default function Page() {}`,
        [
          {
            isFunction: true,
            declName: 'Page',
            defaultExportIdentifierName: undefined,
          },
        ],
      ],
      [
        `export default class Page {}`,
        [
          {
            isFunction: false,
            declName: 'Page',
            defaultExportIdentifierName: undefined,
          },
        ],
      ],
      [
        `export default () => {}`,
        [
          {
            isFunction: true,
            declName: undefined,
            defaultExportIdentifierName: undefined,
          },
        ],
      ],
      [
        `export default 1`,
        [
          {
            isFunction: false,
            declName: undefined,
            defaultExportIdentifierName: undefined,
          },
        ],
      ],
      [
        `const Page = () => {}; export default Page`,
        [
          {
            isFunction: undefined,
            declName: undefined,
            defaultExportIdentifierName: 'Page',
          },
        ],
      ],
    ]

    for (const [input, expected] of examples) {
      const actual: unknown[] = []
      const ast = await parseAstAsync(input)
      transformWrapExport(input, ast, {
        runtime(value, _name, meta) {
          actual.push(meta)
          return value
        },
      })
      expect(actual).toEqual(expected)
    }
  })
})
