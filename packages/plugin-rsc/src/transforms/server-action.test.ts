import { parseAstAsync } from 'vite'
import { describe, expect, it } from 'vitest'
import { transformServerActionServer } from './server-action'

const runtime = (value: string, name: string) =>
  `wrap(${value}, ${JSON.stringify(name)})`

describe(transformServerActionServer, () => {
  it('supports custom inline directives and runtimes', async () => {
    const input = `async function cached() { "use cache" }`
    const ast = await parseAstAsync(input)
    const result = transformServerActionServer(input, ast, {
      runtime,
      directive: 'use cache',
      inlineRuntime: (value, name) =>
        `cache(${value}, ${JSON.stringify(name)})`,
    })
    expect(result.output.toString()).toContain('cache($$hoist_0_cached')
  })

  it('supports explicit module directives, filtering, and validation', async () => {
    const input = `"use cache"; export const metadata = 1; export async function cached() {}`
    const ast = await parseAstAsync(input)
    const directive = ast.body[0]!
    expect(directive.type).toBe('ExpressionStatement')
    if (
      directive.type !== 'ExpressionStatement' ||
      directive.expression.type !== 'Literal'
    )
      throw new Error('expected directive')
    const result = transformServerActionServer(input, ast, {
      runtime,
      moduleDirective: directive.expression,
      moduleRuntime: (value, name) =>
        `cache(${value}, ${JSON.stringify(name)})`,
      filter: (name) => name !== 'metadata',
      rejectNonAsyncModule: true,
    })
    expect(result.output.toString()).toContain('/* "use cache" */')
    expect(result.output.toString()).toContain('cache(cached, "cached")')
    expect(result.output.toString()).not.toContain('cache(metadata')
  })

  it('can preserve explicit module directives', async () => {
    const input = `"use cache"; export async function cached() {}`
    const ast = await parseAstAsync(input)
    const statement = ast.body[0]!
    if (
      statement.type !== 'ExpressionStatement' ||
      statement.expression.type !== 'Literal'
    )
      throw new Error('expected directive')
    const result = transformServerActionServer(input, ast, {
      runtime,
      moduleDirective: statement.expression,
      preserveModuleDirective: true,
    })
    expect(result.output.toString()).toContain('"use cache"')
  })

  it('can disable built-in use server module detection', async () => {
    const input = `"use server"; export async function action() {}`
    const ast = await parseAstAsync(input)
    const result = transformServerActionServer(input, ast, {
      runtime,
      detectUseServerModule: false,
    })
    expect('names' in result ? result.names : result.exportNames).toEqual([])
    expect(result.output.hasChanged()).toBe(false)
  })
})
