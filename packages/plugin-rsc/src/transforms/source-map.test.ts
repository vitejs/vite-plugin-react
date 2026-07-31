import path from 'node:path'
import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import { transformHoistInlineDirective } from './hoist'
import { transformModuleExport } from './module-export'
import { transformModuleExportEffect } from './module-export-effect'
import { transformModuleExportHoist } from './module-export-hoist'
import {
  formatSourceMapFixture,
  formatSourceMapMarkdownFixture,
} from './test-utils'
import { transformWrapExport } from './wrap-export'

describe('source map fixtures', () => {
  const moduleExportFixtures = import.meta.glob(
    ['./fixtures/source-map/wrap-export/**/*.js', '!**/*.snap.*'],
    { query: 'raw' },
  )

  const moduleExportModels = [
    'wrap-export',
    'module-export',
    'module-export-effect',
    'module-export-hoist',
  ] as const

  for (const [file, load] of Object.entries(moduleExportFixtures)) {
    test(`module-export-models/${path.basename(file)}`, async () => {
      const input = ((await load()) as any).default as string
      const ast = await parseAstAsync(input)
      const outputs = moduleExportModels.map((model) => {
        try {
          let output
          let references: string[]
          if (model === 'wrap-export') {
            const result = transformWrapExport(input, ast, {
              runtime: (value, name) =>
                `registerServerReference(${value}, ${JSON.stringify(name)})`,
            })
            output = result.output
            references = result.exportNames
          } else if (model === 'module-export') {
            const result = transformModuleExport(input, ast, {
              generate: ({ implementation, binding, exportName }) =>
                `const ${binding} = registerServerReference(${implementation}, ${JSON.stringify(exportName)});\n` +
                `export { ${binding} as ${exportName} };`,
            })
            output = result.output
            references = result.referenceNames
          } else if (model === 'module-export-effect') {
            const result = transformModuleExportEffect(input, ast, {
              generate: ({ binding, exportName }) =>
                `registerServerReference(${binding}, ${JSON.stringify(exportName)});`,
            })
            output = result.output
            references = result.referenceNames
          } else {
            const result = transformModuleExportHoist(input, ast, {
              directive: 'use server',
              runtime: ({ implementation, exportName }) =>
                `registerServerReference(${implementation}, ${JSON.stringify(exportName)})`,
            })
            output = result.output
            references = result.referenceNames
          }
          return { name: model, output, references }
        } catch (error) {
          return {
            name: model,
            error: error instanceof Error ? error.message : String(error),
          }
        }
      })
      await expect(
        formatSourceMapMarkdownFixture(input, outputs),
      ).toMatchFileSnapshot(`${file}.snap.md`)
    })
  }

  const hoistFixtures = import.meta.glob(
    ['./fixtures/source-map/hoist/**/*.js', '!**/*.snap.*'],
    { query: 'raw' },
  )

  for (const [file, load] of Object.entries(hoistFixtures)) {
    test(`hoist/${path.basename(file)}`, async () => {
      const input = ((await load()) as any).default as string
      const ast = await parseAstAsync(input)
      const result = transformHoistInlineDirective(input, ast, {
        directive: 'use server',
        runtime: (value, name) =>
          `registerServerReference(${value}, ${JSON.stringify(name)})`,
        encode: (value) => `encrypt(${value})`,
        decode: (value) => `await decrypt(${value})`,
      })
      await expect(formatSourceMapFixture(result.output)).toMatchFileSnapshot(
        file + '.snap.js',
      )
    })
  }
})
