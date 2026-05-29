import type { ExportAllDeclaration, Program } from 'estree'
import MagicString from 'magic-string'
import { extractNames } from './utils'

type TransformExpandExportAllOptions = {
  importer: string
  resolve: (source: string, importer: string) => Promise<string | undefined>
  load: (id: string) => Promise<string | undefined>
  parse: (code: string) => Promise<Program>
}

export async function transformExpandExportAll(
  code: string,
  ast: Program,
  options: TransformExpandExportAllOptions,
): Promise<{ code: string; ast: Program } | undefined> {
  const targets = ast.body.filter(
    (n): n is ExportAllDeclaration =>
      n.type === 'ExportAllDeclaration' && !n.exported,
  )
  if (targets.length === 0) return

  const output = new MagicString(code)
  for (const node of targets) {
    const source = node.source.value as string
    const resolved = await options.resolve(source, options.importer)
    if (!resolved) continue
    const names = await collectExportNames(resolved, options, new Set())
    if (names.length === 0) {
      output.remove(node.start, node.end)
    } else {
      output.update(
        node.start,
        node.end,
        `export { ${names.join(', ')} } from ${JSON.stringify(source)};`,
      )
    }
  }
  if (!output.hasChanged()) return
  const newCode = output.toString()
  const newAst = await options.parse(newCode)
  return { code: newCode, ast: newAst }
}

async function collectExportNames(
  resolvedId: string,
  options: TransformExpandExportAllOptions,
  seen: Set<string>,
): Promise<string[]> {
  if (seen.has(resolvedId)) return []
  seen.add(resolvedId)

  let moduleCode: string | undefined
  try {
    moduleCode = await options.load(resolvedId)
  } catch {
    return []
  }
  if (!moduleCode) return []

  let ast: Program
  try {
    ast = await options.parse(moduleCode)
  } catch {
    return []
  }

  const names: string[] = []
  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (
          node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration'
        ) {
          if (node.declaration.id) names.push(node.declaration.id.name)
        } else if (node.declaration.type === 'VariableDeclaration') {
          for (const decl of node.declaration.declarations) {
            names.push(...extractNames(decl.id))
          }
        }
      } else {
        for (const spec of node.specifiers) {
          if (
            spec.exported.type === 'Identifier' &&
            spec.exported.name !== 'default'
          ) {
            names.push(spec.exported.name)
          }
        }
      }
    } else if (node.type === 'ExportAllDeclaration') {
      if (node.exported?.type === 'Identifier') {
        names.push(node.exported.name)
      } else if (node.source) {
        const subResolved = await options.resolve(
          node.source.value as string,
          resolvedId,
        )
        if (subResolved) {
          names.push(...(await collectExportNames(subResolved, options, seen)))
        }
      }
    }
  }
  return names
}
