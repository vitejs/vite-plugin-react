import path from 'node:path'
import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import { transformHoistInlineDirective } from './hoist'
import { transformModuleExport } from './module-export'
import { transformModuleExportEffect } from './module-export-effect'
import { transformModuleExportHoist } from './module-export-hoist'
import { formatSourceMapFixture } from './test-utils'
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

  for (const model of moduleExportModels) {
    for (const [file, load] of Object.entries(moduleExportFixtures)) {
      test(`${model}/${path.basename(file)}`, async () => {
        const input = ((await load()) as any).default as string
        const ast = await parseAstAsync(input)
        let output
        if (model === 'wrap-export') {
          output = transformWrapExport(input, ast, {
            runtime: (value, name) =>
              `registerServerReference(${value}, ${JSON.stringify(name)})`,
          }).output
        } else if (model === 'module-export') {
          output = transformModuleExport(input, ast, {
            generate: ({ implementation, binding, exportName }) =>
              `const ${binding} = registerServerReference(${implementation}, ${JSON.stringify(exportName)});\n` +
              `export { ${binding} as ${exportName} };`,
          }).output
        } else if (model === 'module-export-effect') {
          output = transformModuleExportEffect(input, ast, {
            generate: ({ binding, exportName }) =>
              `registerServerReference(${binding}, ${JSON.stringify(exportName)});`,
          }).output
        } else {
          output = transformModuleExportHoist(input, ast, {
            directive: 'use server',
            runtime: ({ implementation, exportName }) =>
              `registerServerReference(${implementation}, ${JSON.stringify(exportName)})`,
          }).output
        }
        await expect(formatSourceMapFixture(output)).toMatchFileSnapshot(
          `${file}.${model}.snap.js`,
        )
      })
    }
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
