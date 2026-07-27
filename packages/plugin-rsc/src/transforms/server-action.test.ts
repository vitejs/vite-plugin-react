import { parseAstAsync } from 'vite'
import { expect, test } from 'vitest'
import { transformServerActionServer } from './server-action'

async function transform(input: string) {
  const ast = await parseAstAsync(input)
  return transformServerActionServer(input, ast, {
    runtime: (value) => value,
  })
}

test('normalizes top-level server reference names', async () => {
  const result = await transform(
    `'use server'; export async function action() {}`,
  )

  expect(result).toMatchObject({
    exportNames: ['action'],
    referenceNames: ['action'],
  })
})

test('normalizes inline server reference names', async () => {
  const result = await transform(
    `export function App() { return async function action() { 'use server' } }`,
  )

  expect(result).toMatchObject({
    names: ['$$hoist_0_action'],
    referenceNames: ['$$hoist_0_action'],
  })
})
