import type MagicString from 'magic-string'
import { parseAstAsync, type ESTree } from 'vite'
import { expect, test } from 'vitest'
import { transformDirectiveProxyExport } from './proxy-export'
import { transformServerActionServer } from './server-action'
import { formatTransformMarkdownFixture } from './test-utils'

// Fixtures copied from
// https://github.com/wakujs/waku/blob/55cc5fb3c74b1cd9fa5dac5b20b8626c4d5043ff/packages/waku/tests/vite-plugin-rsc-transform-internals.test.ts

type FixtureResult =
  | {
      output: MagicString
      references: string[]
    }
  | undefined

type FixtureTransform = (input: string, ast: ESTree.Program) => FixtureResult

function runFixtures(
  root: string,
  fixtures: Record<string, () => Promise<unknown>>,
  name: string,
  transform: FixtureTransform,
) {
  for (const [file, load] of Object.entries(fixtures)) {
    test(`${name}/${file.slice(root.length)}`, async () => {
      const input = ((await load()) as any).default as string
      const ast = await parseAstAsync(input)
      const result = transform(input, ast)
      if (result) {
        await parseAstAsync(result.output.toString())
      }
      await expect(
        formatTransformMarkdownFixture(input, [
          {
            name,
            output: result?.output,
            references: result?.references,
          },
        ]),
      ).toMatchFileSnapshot(file + '.snap.md')
    })
  }
}

const serverActionRoot = './fixtures/waku/server-action/'
const serverActionFixtures = import.meta.glob(
  ['./fixtures/waku/server-action/**/*.js', '!**/*.snap.*'],
  { query: 'raw' },
)
runFixtures(
  serverActionRoot,
  serverActionFixtures,
  'server action',
  (input, ast) => {
    const result = transformServerActionServer(input, ast, {
      runtime: (value, name) =>
        `$runtime(${value}, "<id>", ${JSON.stringify(name)})`,
    })
    return { output: result.output, references: result.referenceNames }
  },
)

const serverClientProxyRoot = './fixtures/waku/server-client-proxy/'
const serverClientProxyFixtures = import.meta.glob(
  ['./fixtures/waku/server-client-proxy/**/*.js', '!**/*.snap.*'],
  { query: 'raw' },
)
runFixtures(
  serverClientProxyRoot,
  serverClientProxyFixtures,
  'server client proxy',
  (input, ast) => {
    const result = transformDirectiveProxyExport(ast, {
      directive: 'use client',
      code: input,
      runtime: (name) =>
        `$runtime(${JSON.stringify('<id>#' + name)}, ${JSON.stringify(name)})`,
      keep: true,
    })
    return result
      ? { output: result.output, references: result.exportNames }
      : undefined
  },
)

const clientServerProxyRoot = './fixtures/waku/client-server-proxy/'
const clientServerProxyFixtures = import.meta.glob(
  ['./fixtures/waku/client-server-proxy/**/*.js', '!**/*.snap.*'],
  { query: 'raw' },
)
runFixtures(
  clientServerProxyRoot,
  clientServerProxyFixtures,
  'client server proxy',
  (input, ast) => {
    const result = transformDirectiveProxyExport(ast, {
      directive: 'use server',
      code: input,
      runtime: (name) =>
        `$runtime(${JSON.stringify('<id>#' + name)}, ${JSON.stringify(name)})`,
    })
    return result
      ? { output: result.output, references: result.exportNames }
      : undefined
  },
)
