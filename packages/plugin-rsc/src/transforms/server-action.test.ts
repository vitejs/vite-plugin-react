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
    names: ['$$hoist_0_anonymous_server_function'],
    referenceNames: ['$$hoist_0_anonymous_server_function'],
  })
})

test.each([
  `'use server'; export async function action() { arguments }`,
  `export function App() { return async function action() { 'use server'; this.value } }`,
])('validates server functions: %s', async (input) => {
  await expect(transform(input)).rejects.toThrow(/cannot use/)
})

test('does not apply a file directive to non-exported functions', async () => {
  await expect(
    transform(`
'use server'
async function helper() { arguments }
export async function action() {}
`),
  ).resolves.toBeDefined()
})

test('leaves unresolved local exports for local binding resolution', async () => {
  await expect(
    transform(`
'use server'
async function action() { arguments }
export { action }
`),
  ).resolves.toBeDefined()
})
