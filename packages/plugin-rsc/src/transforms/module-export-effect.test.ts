import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import {
  transformModuleExportEffect,
  type TransformModuleExportEffectOptions,
} from './module-export-effect'

async function transform(
  input: string,
  options: Omit<TransformModuleExportEffectOptions, 'runtime'> = {},
) {
  const ast = await parseAstAsync(input)
  return transformModuleExportEffect(input, ast, {
    ...options,
    runtime: ({ binding, exportName }) =>
      `register(${binding}, ${JSON.stringify(exportName)})`,
  })
}

describe(transformModuleExportEffect, () => {
  test('preserves declarations and emits effects after initialization', async () => {
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
      async function action() {}
      const loader = async () => {}, value = 1
      async function Page() {}

      register(action, \"action\");
      export { action };

      register(loader, \"loader\");
      register(value, \"value\");
      export { loader, value };

      register(Page, \"default\");
      export default Page;
      "
    `)
  })

  test('preserves mutable bindings and local export aliases', async () => {
    const result = await transform(`
export { action as renamed }
let action = async () => 'first'
action = async () => 'second'
`)

    expect(result.referenceNames).toEqual(['renamed'])
    expect(result.output.toString()).toMatchInlineSnapshot(`
      "

      let action = async () => 'first'
      action = async () => 'second'

      register(action, \"renamed\");
      export { action as renamed }
      "
    `)
  })

  test('captures a default identifier before later reassignment', async () => {
    const result = await transform(`let action = async () => 'first'
export default action
action = async () => 'second'
`)

    expect(result.output.toString()).toMatchInlineSnapshot(`
      "let action = async () => 'first'
      const $$effect_default = action;
      action = async () => 'second'

      register($$effect_default, \"default\");
      export default $$effect_default;
      "
    `)
  })
})
