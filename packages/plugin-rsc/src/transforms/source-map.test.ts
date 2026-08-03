import path from 'node:path'
import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import { transformHoistInlineDirective } from './hoist'
import { transformModuleExportEffect } from './module-export-effect'
import {
  formatDecodedSourceMapMarkdown,
  formatSourceMapMarkdownFixture,
} from './test-utils'
import { transformWrapExport } from './wrap-export'

describe('source map fixtures', () => {
  const wrapExportFixtures = import.meta.glob(
    ['./fixtures/source-map/wrap-export/**/*.js', '!**/*.snap.*'],
    { query: 'raw' },
  )
  // Generated runtime expressions should map to the original Server Function
  // export site, or to the export statement for re-exports. React uses the
  // `registerServerReference` caller as the reference's source location.
  for (const [file, load] of Object.entries(wrapExportFixtures)) {
    test(`module-export/${path.basename(file)}`, async () => {
      const input = ((await load()) as any).default as string
      const ast = await parseAstAsync(input)
      const wrapResult = transformWrapExport(input, ast, {
        runtime: (value, name) =>
          `registerServerReference(${value}, ${JSON.stringify(name)})`,
      })
      const effectResult = transformModuleExportEffect(input, ast, {
        generate: ({ binding, exportName }) =>
          `registerServerReference(${binding}, ${JSON.stringify(exportName)})`,
      })
      const outputs = [
        {
          name: 'wrap-export',
          output: wrapResult.output,
          references: wrapResult.exportNames,
        },
        {
          name: 'module-export-effect',
          output: effectResult.output,
          references: effectResult.referenceNames,
        },
      ]
      await expect(
        formatSourceMapMarkdownFixture(input, outputs),
      ).toMatchFileSnapshot(file + '.snap.md')
      await expect(formatDecodedSourceMapMarkdown(outputs)).toMatchFileSnapshot(
        file + '.map.snap.md',
      )
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
      const outputs = [
        {
          name: 'hoist',
          output: result.output,
          references: result.names,
        },
      ]
      await expect(
        formatSourceMapMarkdownFixture(input, outputs),
      ).toMatchFileSnapshot(file + '.snap.md')
      await expect(formatDecodedSourceMapMarkdown(outputs)).toMatchFileSnapshot(
        file + '.map.snap.md',
      )
    })
  }
})
