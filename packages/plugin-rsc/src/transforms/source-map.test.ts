import path from 'node:path'
import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import { transformHoistInlineDirective } from './hoist'
import { transformModuleExportEffect } from './module-export-effect'
import { transformProxyExport } from './proxy-export'
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
  // Effects emitted through declaration rewrites map to the original Server
  // Function export site. Appended export-specifier effects remain unmapped and
  // rely on adjacent-source fallback. React uses the `registerServerReference`
  // caller as the reference's source location.
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
      const proxyResult = transformProxyExport(ast, {
        code: input,
        runtime: (name) => `createServerReference(${JSON.stringify(name)})`,
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
        {
          name: 'proxy-export',
          output: proxyResult.output,
          references: proxyResult.exportNames,
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

  const proxyExportFixtures = import.meta.glob(
    ['./fixtures/source-map/proxy-export/**/*.js', '!**/*.snap.*'],
    { query: 'raw' },
  )
  const proxyExportFixtureVariants: Record<
    string,
    {
      name: string
      keep?: boolean
      ignoreExportAllDeclaration?: boolean
    }[]
  > = {
    './fixtures/source-map/proxy-export/export-all-ignore.js': [
      { name: 'proxy-export', ignoreExportAllDeclaration: true },
    ],
    './fixtures/source-map/proxy-export/keep.js': [
      { name: 'proxy-export' },
      { name: 'proxy-export-keep', keep: true },
    ],
  }
  for (const [file, load] of Object.entries(proxyExportFixtures)) {
    const fixtureName = file.slice('./fixtures/source-map/proxy-export/'.length)
    test(`proxy-export/${fixtureName}`, async () => {
      const input = ((await load()) as any).default as string
      const ast = await parseAstAsync(input)
      const variants = proxyExportFixtureVariants[file] ?? [
        { name: 'proxy-export' },
      ]
      const outputs = variants.map(({ name, ...options }) => {
        const result = transformProxyExport(ast, {
          code: input,
          ...options,
          runtime: (name, meta) =>
            meta?.value
              ? `createServerReference(${meta.value}, ${JSON.stringify(name)})`
              : `createServerReference(${JSON.stringify(name)})`,
        })
        return {
          name,
          output: result.output,
          references: result.exportNames,
        }
      })
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
