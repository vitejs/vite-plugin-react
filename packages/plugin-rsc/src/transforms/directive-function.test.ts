import type { Node, Program } from 'estree'
import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import { validateDirectiveFunction } from './directive-function'

async function getFunction(input: string): Promise<Node> {
  const ast = (await parseAstAsync(input)) as unknown as Program
  const statement = ast.body[0]!
  if (statement.type === 'FunctionDeclaration') return statement
  if (statement.type === 'ClassDeclaration') {
    const member = statement.body.body[0]!
    if (member.type === 'MethodDefinition') return member.value
  }
  throw new Error('unsupported test input')
}

describe(validateDirectiveFunction, () => {
  test.each([
    [`async function action() { this.value }`, 'this'],
    [`async function action() { arguments }`, 'arguments'],
    [`async function action(value = arguments) {}`, 'arguments'],
    [`class A extends B { static async action() { super.action() } }`, 'super'],
  ])('rejects %s', async (input, expression) => {
    const node = await getFunction(input)
    expect(() => validateDirectiveFunction(node, 'use server')).toThrow(
      `"use server" functions cannot use "${expression}".`,
    )
  })

  test('follows arrow lexical bindings', async () => {
    const node = await getFunction(`
async function action() {
  const nested = () => arguments
}
`)
    expect(() => validateDirectiveFunction(node, 'use server')).toThrow(
      /arguments/,
    )
  })

  test('stops at nested normal functions', async () => {
    const node = await getFunction(`
async function action() {
  function nested() {
    this.value
    arguments
    const arrow = () => this.value
  }
}
`)
    expect(() => validateDirectiveFunction(node, 'use server')).not.toThrow()
  })

  test('ignores syntax-only arguments identifiers and jsxDEV metadata', async () => {
    const node = await getFunction(`
async function action() {
  const value = { arguments: 1 }
  return _jsxDEV(Component, {}, undefined, false, undefined, this)
}
`)
    expect(() => validateDirectiveFunction(node, 'use server')).not.toThrow()
  })

  test('ignores unknown and non-function values', async () => {
    const ast = (await parseAstAsync(
      'export default action',
    )) as unknown as Program
    const statement = ast.body[0]!
    expect(statement.type).toBe('ExportDefaultDeclaration')
    if (statement.type !== 'ExportDefaultDeclaration') return
    expect(() =>
      validateDirectiveFunction(statement.declaration, 'use server'),
    ).not.toThrow()
    expect(() =>
      validateDirectiveFunction(undefined, 'use server'),
    ).not.toThrow()
  })

  test('stops at nested classes', async () => {
    const node = await getFunction(`
async function action() {
  class Nested extends Base {
    value = this.value
    method() { return super.method() }
    static { this.initialize() }
  }
}
`)
    expect(() => validateDirectiveFunction(node, 'use server')).not.toThrow()
  })
})
