import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import { transformModuleExport } from './module-export'
import { transformModuleExportEffect } from './module-export-effect'
import { transformModuleExportHoist } from './module-export-hoist'

describe('module export transform models', () => {
  test('compares canonical bindings, export effects, and hoisted expressions', async () => {
    const input = `"use cache";
export async function action(value) {
  return value
}
export const loader = async () => "loaded"
export default async function Page() {
  return "page"
}
`
    const ast = await parseAstAsync(input)
    const canonical = transformModuleExport(input, ast, {
      generate: ({ implementation, binding, exportName }) =>
        `const ${binding} = wrap(${implementation}, ${JSON.stringify(exportName)}); export { ${binding} as ${exportName} };`,
    })
    const effect = transformModuleExportEffect(input, ast, {
      generate: ({ binding, exportName }) =>
        `register(${binding}, ${JSON.stringify(exportName)});`,
    })
    const hoist = transformModuleExportHoist(input, ast, {
      directive: 'use cache',
      runtime: ({ implementation, exportName }) =>
        `wrap(${implementation}, ${JSON.stringify(exportName)})`,
    })

    const outputs = {
      canonical: canonical.output.toString(),
      effect: effect.output.toString(),
      hoist: hoist.output.toString(),
    }
    await Promise.all(
      Object.values(outputs).map((output) => parseAstAsync(output)),
    )

    expect({
      referenceNames: {
        canonical: canonical.referenceNames,
        effect: effect.referenceNames,
        hoist: hoist.referenceNames,
      },
      outputs,
    }).toMatchInlineSnapshot(`
      {
        "outputs": {
          "canonical": ""use cache";
      async function action$$impl(value) {
        return value
      }
      const action = wrap(action$$impl, "action"); export { action as action };

      const loader$$impl = async () => "loaded"
      const loader = wrap(loader$$impl, "loader"); export { loader as loader };

      async function Page$$impl() {
        return "page"
      }
      const Page = wrap(Page$$impl, "default"); export { Page as default };

      ",
          "effect": ""use cache";
      export async function action(value) {
        return value
      }
      export const loader = async () => "loaded"
      export default async function Page() {
        return "page"
      }

      register(action, "action");
      register(loader, "loader");
      register(Page, "default");
      ",
          "hoist": ""use cache";
      export const action = /* #__PURE__ */ wrap($$module_hoist_0_action, "action");
      export const loader = /* #__PURE__ */ wrap($$module_hoist_1_loader, "loader")
      const Page = /* #__PURE__ */ wrap($$module_hoist_2_Page, "default");
      export default Page;

      ;async function $$module_hoist_0_action(value) {
        return value
      };
      /* #__PURE__ */ Object.defineProperty($$module_hoist_0_action, "name", { value: "action" });

      ;async function $$module_hoist_1_loader() { return "loaded" };
      /* #__PURE__ */ Object.defineProperty($$module_hoist_1_loader, "name", { value: "loader" });

      ;async function $$module_hoist_2_Page() {
        return "page"
      };
      /* #__PURE__ */ Object.defineProperty($$module_hoist_2_Page, "name", { value: "Page" });
      ",
        },
        "referenceNames": {
          "canonical": [
            "action",
            "loader",
            "default",
          ],
          "effect": [
            "action",
            "loader",
            "default",
          ],
          "hoist": [
            "action",
            "loader",
            "default",
          ],
        },
      }
    `)
  })

  test('supports anonymous default functions', async () => {
    const input = `"use cache"; export default async function () {}`
    const ast = await parseAstAsync(input)
    const effect = transformModuleExportEffect(input, ast, {
      generate: ({ binding }) => `register(${binding});`,
    })
    const hoist = transformModuleExportHoist(input, ast, {
      directive: 'use cache',
      runtime: ({ implementation }) => `wrap(${implementation})`,
    })

    await expect(parseAstAsync(effect.output.toString())).resolves.toBeDefined()
    await expect(parseAstAsync(hoist.output.toString())).resolves.toBeDefined()
    expect({
      effect: effect.output.toString(),
      hoist: hoist.output.toString(),
    }).toMatchInlineSnapshot(`
      {
        "effect": ""use cache"; const $$effect_default = async function () {}
      export default $$effect_default;
      register($$effect_default);
      ",
        "hoist": ""use cache"; export default /* #__PURE__ */ wrap($$module_hoist_0_anonymous_default)

      ;async function $$module_hoist_0_anonymous_default() {};
      /* #__PURE__ */ Object.defineProperty($$module_hoist_0_anonymous_default, "name", { value: "anonymous_default" });
      ",
      }
    `)
  })
})
