import path from 'node:path'
import type MagicString from 'magic-string'
import { parseAstAsync } from 'vite'
import { expect, test } from 'vitest'
import { transformHoistInlineDirective } from './hoist'
import type { ModuleExportMeta } from './module-export-scan'
import { transformDirectiveProxyExport } from './proxy-export'
import { transformServerActionServer } from './server-action'
import { formatTransformMarkdownFixture } from './test-utils'
import { hasDirective } from './utils'
import { transformWrapExport } from './wrap-export'

const fixtures = import.meta.glob(
  ['./fixtures/mixed-directives/*.js', '!**/*.snap.*'],
  { query: 'raw' },
)

for (const [file, load] of Object.entries(fixtures)) {
  test(path.basename(file), async () => {
    const input = ((await load()) as any).default as string
    const cacheResult = await transformUseCache(input)
    const rscResult = await transformUseServer(cacheResult.output.toString())
    const proxyResult = await transformMixedDirectiveProxy(input)

    await parseAstAsync(rscResult.output.toString())
    await parseAstAsync(proxyResult.output.toString())
    await expect(
      formatTransformMarkdownFixture(input, [
        {
          name: 'framework cache RSC transform',
          output: cacheResult.output,
          references: cacheResult.references,
        },
        {
          name: 'final RSC transform',
          output: rscResult.output,
          references: rscResult.references,
        },
        {
          name: 'browser and SSR proxy transform',
          output: proxyResult.output,
          references: proxyResult.references,
        },
      ]),
    ).toMatchFileSnapshot(file + '.snap.md')
  })
}

type TransformResult = {
  output: MagicString
  references: string[]
}

async function transformUseCache(input: string): Promise<TransformResult> {
  const ast = await parseAstAsync(input)
  const result = hasDirective(ast.body, 'use cache')
    ? transformWrapExport(input, ast, {
        runtime: cacheRuntime,
        filter: (_name, meta) => !hasFunctionDirective(meta, 'use server'),
      })
    : transformHoistInlineDirective(input, ast, {
        directive: 'use cache',
        hoistRuntime: true,
        runtime: cacheRuntime,
      })

  const importPosition =
    ast.body.find((node) => !('directive' in node))?.start ?? input.length
  result.output.prependLeft(
    importPosition,
    `import { cache as $cache, register as $registerCache } from "cache-runtime";\n`,
  )
  return {
    output: result.output,
    references: 'names' in result ? result.names : result.exportNames,
  }
}

async function transformUseServer(input: string): Promise<TransformResult> {
  const ast = await parseAstAsync(input)
  const result = transformServerActionServer(input, ast, {
    runtime: (value, name) =>
      `$registerServer(${value}, ${JSON.stringify(name)})`,
  })
  return { output: result.output, references: result.referenceNames }
}

async function transformMixedDirectiveProxy(
  input: string,
): Promise<TransformResult> {
  const ast = await parseAstAsync(input)
  const result =
    transformDirectiveProxyExport(ast, {
      code: input,
      directive: 'use cache',
      runtime: (name) => `$cacheProxy(${JSON.stringify(name)})`,
    }) ??
    transformDirectiveProxyExport(ast, {
      code: input,
      directive: 'use server',
      runtime: (name) => `$serverProxy(${JSON.stringify(name)})`,
    })
  if (!result) {
    throw new Error('expected a file directive')
  }
  return { output: result.output, references: result.exportNames }
}

function cacheRuntime(value: string, name: string): string {
  return `$registerCache($cache(${value}), ${JSON.stringify(name)})`
}

function hasFunctionDirective(
  meta: Pick<ModuleExportMeta, 'valueNode'>,
  directive: string,
): boolean {
  const node = meta.valueNode
  if (
    (node?.type !== 'FunctionDeclaration' &&
      node?.type !== 'FunctionExpression' &&
      node?.type !== 'ArrowFunctionExpression') ||
    node.body.type !== 'BlockStatement'
  ) {
    return false
  }
  return node.body.body.some(
    (statement) =>
      statement.type === 'ExpressionStatement' &&
      'directive' in statement &&
      statement.directive === directive,
  )
}
