import path from 'node:path'
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
    const ast = await parseAstAsync(input)
    const cacheResult = hasDirective(ast.body, 'use cache')
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
    cacheResult.output.prependLeft(
      importPosition,
      `import { cache as $cache, register as $registerCache } from "cache-runtime";\n`,
    )
    const cacheCode = cacheResult.output.toString()
    const cacheReferences =
      'names' in cacheResult ? cacheResult.names : cacheResult.exportNames

    const rscAst = await parseAstAsync(cacheCode)
    const rscResult = transformServerActionServer(cacheCode, rscAst, {
      runtime: (value, name) =>
        `$registerServer(${value}, ${JSON.stringify(name)})`,
    })

    let proxyAst = ast
    let proxyCode = input
    let proxyResult = transformDirectiveProxyExport(proxyAst, {
      code: proxyCode,
      directive: 'use cache',
      runtime: (name) => `$cacheProxy(${JSON.stringify(name)})`,
    })
    if (proxyResult) {
      proxyCode = proxyResult.output.toString()
      proxyAst = await parseAstAsync(proxyCode)
    }
    proxyResult ??= transformDirectiveProxyExport(proxyAst, {
      code: proxyCode,
      directive: 'use server',
      runtime: (name) => `$serverProxy(${JSON.stringify(name)})`,
    })

    await parseAstAsync(rscResult.output.toString())
    if (proxyResult) {
      await parseAstAsync(proxyResult.output.toString())
    }
    await expect(
      formatTransformMarkdownFixture(input, [
        {
          name: 'framework cache RSC transform',
          output: cacheResult.output,
          references: cacheReferences,
        },
        {
          name: 'final RSC transform',
          output: rscResult.output,
          references: rscResult.referenceNames,
        },
        {
          name: 'browser and SSR proxy transform',
          output: proxyResult?.output,
          references: proxyResult?.exportNames,
        },
      ]),
    ).toMatchFileSnapshot(file + '.snap.md')
  })
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
