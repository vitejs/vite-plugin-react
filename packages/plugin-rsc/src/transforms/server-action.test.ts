import { parseAstAsync } from 'vite'
import { expect, test } from 'vitest'
import { transformServerActionServer } from './server-action'

async function transform(input: string) {
  const ast = await parseAstAsync(input)
  return transformServerActionServer(input, ast, {
    runtime: (value) => `register(${value})`,
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
  expect(result.output.toString()).toMatchInlineSnapshot(
    `
    "'use server'; async function action() {}
    register(action);
    export { action };
    "
  `,
  )
})

test('normalizes inline server reference names', async () => {
  const result = await transform(
    `export function App() { return async function action() { 'use server' } }`,
  )

  expect(result).toMatchObject({
    names: ['$$hoist_0_anonymous_server_function'],
    referenceNames: ['$$hoist_0_anonymous_server_function'],
  })
})
