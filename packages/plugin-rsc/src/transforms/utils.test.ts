import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import { transformProxyExport } from './proxy-export'
import { validateNonAsyncFunction } from './utils'
import { transformWrapExport } from './wrap-export'

describe(validateNonAsyncFunction, () => {
  // next.js's validation isn't entirely consistent.
  // for now we aim to make it at least as forgiving as next.js.

  const accepted = [
    `export async function f() {}`,
    `export default async function f() {}`,
    `export const fn = async function fn() {}`,
    `export const fn = async () => {}`,
    `export const fn = async () => {}, fn2 = x`,
    `export const fn = x`,
    `export const fn = x({ x: y })`,
    `export const fn = x(async () => {})`,
    `export default x`,
    `const y = x; export { y }`,
    `export const fn = x(() => {})`, // rejected by next.js
    `export const testAction = actionClient.action(async () => { return { message: "Hello, world!" }; });`,
  ]

  const rejected = [
    `export function f() {}`,
    `export default function f() {}`,
    `export const fn = function fn() {}`,
    `export const fn = () => {}`,
    `export const fn = x, fn2 = () => {}`,
    `export class Cls {}`,
    `export const Cls = class {}`,
    `export const Cls = class Foo {}`,
  ]

  test(transformWrapExport, async () => {
    const testTransform = async (input: string) => {
      const ast = await parseAstAsync(input)
      const result = transformWrapExport(input, ast, {
        runtime: (value, name) =>
          `$$wrap(${value}, "<id>", ${JSON.stringify(name)})`,
        ignoreExportAllDeclaration: true,
        rejectNonAsyncFunction: true,
      })
      return result.output.hasChanged()
    }

    for (const code of accepted) {
      await expect.soft(testTransform(code)).resolves.toBe(true)
    }
    for (const code of rejected) {
      await expect
        .soft(testTransform(code))
        .rejects.toMatchInlineSnapshot(
          `[Error: unsupported non async function]`,
        )
    }
  })

  test(transformProxyExport, async () => {
    const testTransform = async (input: string) => {
      const ast = await parseAstAsync(input)
      const result = transformProxyExport(ast, {
        code: input,
        rejectNonAsyncFunction: true,
        runtime: (name) => `$$proxy("<id>", ${JSON.stringify(name)})`,
      })
      return result.output.hasChanged()
    }

    for (const code of accepted) {
      await expect.soft(testTransform(code)).resolves.toBe(true)
    }
    for (const code of rejected) {
      await expect
        .soft(testTransform(code))
        .rejects.toMatchInlineSnapshot(
          `[Error: unsupported non async function]`,
        )
    }
  })
})
