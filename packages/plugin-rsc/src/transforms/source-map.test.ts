import path from 'node:path'
import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import { transformHoistInlineDirective } from './hoist'
import { formatSourceMapFixture } from './test-utils'
import { transformWrapExport } from './wrap-export'

describe('source map fixtures', () => {
  const wrapExportFixtures = import.meta.glob(
    ['./fixtures/source-map/wrap-export/**/*.js', '!**/*.snap.*'],
    { query: 'raw' },
  )

  for (const [file, load] of Object.entries(wrapExportFixtures)) {
    test(`wrap-export/${path.basename(file)}`, async () => {
      const input = ((await load()) as any).default as string
      const ast = await parseAstAsync(input)
      const result = transformWrapExport(input, ast, {
        runtime: (value, name) =>
          `registerServerReference(${value}, ${JSON.stringify(name)})`,
      })
      await expect(
        formatSourceMapFixture(input, result.output),
      ).toMatchFileSnapshot(file + '.snap.js')
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
      await expect(
        formatSourceMapFixture(input, result.output),
      ).toMatchFileSnapshot(file + '.snap.js')
    })
  }
})
