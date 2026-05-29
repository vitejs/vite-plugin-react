import type { ExportAllDeclaration, Program } from 'estree'
import MagicString from 'magic-string'
import { extractNames } from './utils'

type TransformExpandExportAllOptions = {
  importer: string
  resolve: (source: string, importer: string) => Promise<string | undefined>
  load: (id: string) => Promise<Program | undefined>
}

export async function transformExpandExportAll(
  code: string,
  ast: Program,
  options: TransformExpandExportAllOptions,
): Promise<{ code: string } | undefined> {
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
  // TODO: return a sourcemap so callers can compose this pre-rewrite with
  // their follow-up proxy/wrap transform maps.
  return { code: output.toString() }
}

async function collectExportNames(
  resolvedId: string,
  options: TransformExpandExportAllOptions,
  seen: Set<string>,
): Promise<string[]> {
  if (seen.has(resolvedId)) return []
  seen.add(resolvedId)

  let ast: Program | undefined
  try {
    ast = await options.load(resolvedId)
  } catch {
    return []
  }
  if (!ast) return []

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
