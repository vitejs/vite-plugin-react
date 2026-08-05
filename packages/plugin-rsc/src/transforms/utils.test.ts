import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import { transformProxyExport } from './proxy-export'
import { hasDirective, validateNonAsyncFunction } from './utils'
import { transformWrapExport } from './wrap-export'

describe(hasDirective, () => {
  test.each([
    [`'use server'; export {};`, true],
    [`'use strict'; 'use server'; export {};`, true],
    [`import './setup.js'; 'use server'; export {};`, false],
    [`('use server'); export {};`, false],
    [`; 'use server'; export {};`, false],
    [`'use client'; export {};`, false],
    [`'use strict'; 'use client'; export {};`, false],
  ])('recognizes directive prologues', async (input, expected) => {
    const ast = await parseAstAsync(input)
    expect(hasDirective(ast.body, 'use server')).toBe(expected)
  })
})

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
    `export const value = 1`,
    `export const value = {}`,
    `export const value = []`,
    `export default 1`,
    `export default {}`,
    `export default []`,
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
