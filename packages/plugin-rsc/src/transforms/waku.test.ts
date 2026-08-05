import path from 'node:path'
import { parseAstAsync } from 'vite'
import { expect, test } from 'vitest'
import { transformDirectiveProxyExport } from './proxy-export'
import { transformServerActionServer } from './server-action'
import { formatTransformMarkdownFixture } from './test-utils'

// Fixtures copied from
// https://github.com/wakujs/waku/blob/55cc5fb3c74b1cd9fa5dac5b20b8626c4d5043ff/packages/waku/tests/vite-plugin-rsc-transform-internals.test.ts

const serverActionFixtures = import.meta.glob(
  ['./fixtures/waku/server-action/**/*.js', '!**/*.snap.*'],
  { query: 'raw' },
)
for (const [file, load] of Object.entries(serverActionFixtures)) {
  test(`server action/${path.basename(file)}`, async () => {
    const input = ((await load()) as any).default as string
    const ast = await parseAstAsync(input)
    const result = transformServerActionServer(input, ast, {
      runtime: (value, name) =>
        `$runtime(${value}, "<id>", ${JSON.stringify(name)})`,
    })
    await parseAstAsync(result.output.toString())
    await expect(
      formatTransformMarkdownFixture(input, [
        {
          name: 'server action',
          output: result.output,
          references: result.referenceNames,
        },
      ]),
    ).toMatchFileSnapshot(file + '.snap.md')
  })
}

const serverClientProxyFixtures = import.meta.glob(
  ['./fixtures/waku/server-client-proxy/**/*.js', '!**/*.snap.*'],
  { query: 'raw' },
)
for (const [file, load] of Object.entries(serverClientProxyFixtures)) {
  test(`server client proxy/${path.basename(file)}`, async () => {
    const input = ((await load()) as any).default as string
    const ast = await parseAstAsync(input)
    const result = transformDirectiveProxyExport(ast, {
      directive: 'use client',
      code: input,
      runtime: (name) =>
        `$runtime(${JSON.stringify('<id>#' + name)}, ${JSON.stringify(name)})`,
      keep: true,
    })
    if (result) {
      await parseAstAsync(result.output.toString())
    }
    await expect(
      formatTransformMarkdownFixture(input, [
        {
          name: 'server client proxy',
          output: result?.output,
          references: result?.exportNames,
        },
      ]),
    ).toMatchFileSnapshot(file + '.snap.md')
  })
}

const clientServerProxyFixtures = import.meta.glob(
  ['./fixtures/waku/client-server-proxy/**/*.js', '!**/*.snap.*'],
  { query: 'raw' },
)
for (const [file, load] of Object.entries(clientServerProxyFixtures)) {
  test(`client server proxy/${path.basename(file)}`, async () => {
    const input = ((await load()) as any).default as string
    const ast = await parseAstAsync(input)
    const result = transformDirectiveProxyExport(ast, {
      directive: 'use server',
      code: input,
      runtime: (name) =>
        `$runtime(${JSON.stringify('<id>#' + name)}, ${JSON.stringify(name)})`,
    })
    if (result) {
      await parseAstAsync(result.output.toString())
    }
    await expect(
      formatTransformMarkdownFixture(input, [
        {
          name: 'client server proxy',
          output: result?.output,
          references: result?.exportNames,
        },
      ]),
    ).toMatchFileSnapshot(file + '.snap.md')
  })
}
