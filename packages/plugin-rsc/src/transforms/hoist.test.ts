import path from 'node:path'
import { parseAstAsync } from 'vite'
import { describe, expect, it } from 'vitest'
import {
  findDirectives,
  transformHoistInlineDirective,
  type TransformHoistInlineDirectiveOptions,
} from './hoist'

type TestTransformOptions = Omit<
  Partial<TransformHoistInlineDirectiveOptions>,
  'encode'
> & { encode?: boolean }

describe('fixtures', () => {
  const fixtures = import.meta.glob(
    ['./fixtures/hoist/**/*.js', '!**/*.snap.*'],
    {
      query: 'raw',
    },
  )

  async function transformFixture(
    input: string,
    options?: TestTransformOptions,
  ) {
    const ast = await parseAstAsync(input)
    const { output } = transformHoistInlineDirective(input, ast, {
      directive: 'use server',
      runtime: (value, name) =>
        `$$register(${value}, "<id>", ${JSON.stringify(name)})`,
      encode: options?.encode ? (v) => `__enc(${v})` : undefined,
      decode: options?.encode ? (v) => `__dec(${v})` : undefined,
    })
    if (!output.hasChanged()) {
      return '/* NO CHANGE */'
    }
    const transformed = output.toString()
    // verify transform produces valid js
    await parseAstAsync(transformed)
    return transformed
  }

  for (const [file, mod] of Object.entries(fixtures)) {
    it(path.basename(file), async () => {
      const input = ((await mod()) as any).default as string
      await expect
        .soft(await transformFixture(input))
        .toMatchFileSnapshot(file + '.snap.js')
      await expect
        .soft(await transformFixture(input, { encode: true }))
        .toMatchFileSnapshot(file + '.snap.encode.js')
    })
  }
})

describe('hoistRuntime fixtures', () => {
  const fixtures = import.meta.glob(
    ['./fixtures/hoist-runtime/**/*.js', '!**/*.snap.*'],
    { query: 'raw' },
  )

  async function transformFixture(input: string) {
    const ast = await parseAstAsync(input)
    const result = transformHoistInlineDirective(input, ast, {
      directive: 'use server',
      runtime: (value, name) =>
        `$$register(${value}, "<id>", ${JSON.stringify(name)})`,
      encode: (value) => `__enc(${value})`,
      decode: (value) => `__dec(${value})`,
      hoistRuntime: true,
    })
    const transformed = result.output.toString()
    await parseAstAsync(transformed)
    return `// names: ${JSON.stringify(result.names)}\n\n${transformed}`
  }

  for (const [file, mod] of Object.entries(fixtures)) {
    it(path.basename(file), async () => {
      const input = ((await mod()) as any).default as string
      await expect(await transformFixture(input)).toMatchFileSnapshot(
        file + '.snap.js',
      )
    })
  }
})

describe(transformHoistInlineDirective, () => {
  async function testTransform(input: string, options?: TestTransformOptions) {
    const ast = await parseAstAsync(input)
    const { output } = transformHoistInlineDirective(input, ast, {
      ...{ ...options, encode: undefined },
      runtime: (value, name, meta) =>
        `$$register(${value}, "<id>", ${JSON.stringify(name)}` +
        `${
          options?.directive instanceof RegExp
            ? `, ${JSON.stringify({ directiveMatch: meta.directiveMatch })}`
            : ''
        })`,
      directive: options?.directive ?? 'use server',
      encode: options?.encode ? (v) => `__enc(${v})` : undefined,
      decode: options?.encode ? (v) => `__dec(${v})` : undefined,
    })
    if (!output.hasChanged()) {
      return
    }
    const transformed = output.toString()
    await parseAstAsync(transformed)
    return transformed
  }

  async function testTransformNames(input: string) {
    const ast = await parseAstAsync(input)
    const result = transformHoistInlineDirective(input, ast, {
      runtime: (value, name) =>
        `$$register(${value}, "<id>", ${JSON.stringify(name)})`,
      directive: 'use server',
    })
    return result.names
  }

  it('none', async () => {
    const input = `
const x = "x";

async function f() {
  return x;
}
`
    expect(await testTransform(input)).toBeUndefined()
  })

  it('returns generated names in order', async () => {
    const input = `
async function first() {
  "use server";
}
async function second() {
  "use server";
}
`
    expect(await testTransformNames(input)).toEqual([
      '$$hoist_0_first',
      '$$hoist_1_second',
    ])
  })

  it('exposes the source function node to the runtime', async () => {
    const input = `
async function cached(value, { offset }, ...rest) {
  "use cache";
  return [value, offset, rest];
}
`
    const ast = await parseAstAsync(input)
    const valueNodes: unknown[] = []
    transformHoistInlineDirective(input, ast, {
      directive: 'use cache',
      runtime: (value, _name, meta) => {
        valueNodes.push(meta.valueNode)
        return value
      },
    })

    expect(valueNodes).toMatchObject([
      {
        type: 'FunctionDeclaration',
        params: [
          { type: 'Identifier', name: 'value' },
          { type: 'ObjectPattern' },
          { type: 'RestElement' },
        ],
      },
    ])
  })

  it('ignores strings outside a function directive prologue', async () => {
    const input = `
async function initialized() {
  initialize();
  "use server";
}

async function parenthesized() {
  ("use server");
}
`
    expect(await testTransform(input)).toBeUndefined()
  })

  it('recognizes a directive after another prologue directive', async () => {
    const input = `
async function action() {
  "use strict";
  "use server";
}
`
    expect(await testTransformNames(input)).toEqual(['$$hoist_0_action'])
  })

  it('finds directives only in directive-capable bodies', async () => {
    const input = `
{
  "use server";
}
async function action() {
  "use server";
}
`
    const ast = await parseAstAsync(input)
    expect(findDirectives(ast, 'use server')).toHaveLength(1)
  })

  it('noExport', async () => {
    const input = `
export async function test() {
  "use cache";
  return "test";
}
`
    expect(
      await testTransform(input, {
        directive: 'use cache',
        noExport: true,
      }),
    ).toMatchInlineSnapshot(`
      "
      export const test = /* #__PURE__ */ $$register($$hoist_0_test, "<id>", "$$hoist_0_test");

      ;async function $$hoist_0_test() {
        "use cache";
        return "test";
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_test, "name", { value: "test" });
      "
    `)
  })

  it('directive pattern', async () => {
    const input = `
export async function none() {
  "use cache";
  return "test";
}

export async function fs() {
  "use cache: fs";
  return "test";
}

export async function kv() {
  "use cache: kv";
  return "test";
}
`
    expect(
      await testTransform(input, {
        directive: /^use cache(: .+)?$/,
        noExport: true,
      }),
    ).toMatchInlineSnapshot(`
      "
      export const none = /* #__PURE__ */ $$register($$hoist_0_none, "<id>", "$$hoist_0_none", {"directiveMatch":["use cache",null]});

      export const fs = /* #__PURE__ */ $$register($$hoist_1_fs, "<id>", "$$hoist_1_fs", {"directiveMatch":["use cache: fs",": fs"]});

      export const kv = /* #__PURE__ */ $$register($$hoist_2_kv, "<id>", "$$hoist_2_kv", {"directiveMatch":["use cache: kv",": kv"]});

      ;async function $$hoist_0_none() {
        "use cache";
        return "test";
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_none, "name", { value: "none" });

      ;async function $$hoist_1_fs() {
        "use cache: fs";
        return "test";
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_1_fs, "name", { value: "fs" });

      ;async function $$hoist_2_kv() {
        "use cache: kv";
        return "test";
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_2_kv, "name", { value: "kv" });
      "
    `)
  })

  it('no ending new line', async () => {
    const input = `\
export async function test() {
  "use server";
}`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "export const test = /* #__PURE__ */ $$register($$hoist_0_test, "<id>", "$$hoist_0_test");

      ;export async function $$hoist_0_test() {
        "use server";
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_test, "name", { value: "test" });
      "
    `)
  })

  it.each([
    [
      `class Actions { async action() { "use server" } }`,
      `It is not allowed to define inline "use server" class instance methods.`,
    ],
    [
      `class Actions { static async #action() { "use server" } }`,
      `It is not allowed to define inline "use server" private class methods.`,
    ],
    [
      `const actions = { get action() { "use server" } }`,
      `It is not allowed to define inline "use server" getters or setters.`,
    ],
    [
      `class Actions { static set action(value) { "use server" } }`,
      `It is not allowed to define inline "use server" getters or setters.`,
    ],
  ])('rejects unsupported method form in %s', async (input, message) => {
    await expect(testTransform(input)).rejects.toThrow(message)
  })

  it('reports unsupported methods before async policy', async () => {
    await expect(
      testTransform(`const actions = { get action() { "use server" } }`, {
        rejectNonAsyncFunction: true,
      }),
    ).rejects.toThrow(
      `It is not allowed to define inline "use server" getters or setters.`,
    )
  })
})
