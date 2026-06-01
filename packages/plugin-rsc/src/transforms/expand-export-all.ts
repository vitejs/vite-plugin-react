import type { ExportAllDeclaration, Program } from 'estree'
import MagicString from 'magic-string'
import { extractNames } from './utils'

export type TransformExpandExportAllOptions = {
  code: string
  ast: Program
  importer: string
  resolve: (source: string, importer: string) => Promise<string | undefined>
  load: (id: string) => Promise<Program>
}

type StarExportSource = {
  node: ExportAllDeclaration
  source: string
  names: string[]
}

type ModuleExportScan = {
  explicitNames: Set<string>
  starSources: StarExportSource[]
}

type StarRewritePlan = {
  node: ExportAllDeclaration
  source: string
  names: string[]
}

export async function transformExpandExportAll(
  options: TransformExpandExportAllOptions,
): Promise<{ code: string } | undefined> {
  const { code, ast } = options
  const bareStars = ast.body.filter(
    (n): n is ExportAllDeclaration =>
      n.type === 'ExportAllDeclaration' && !n.exported,
  )
  if (bareStars.length === 0) {
    return
  }

  const scan = await scanCurrentModule(bareStars, options)
  const plan = buildStarRewritePlan(scan)
  const output = new MagicString(code)
  for (const item of plan) {
    if (item.names.length === 0) {
      output.remove(item.node.start, item.node.end)
    } else {
      output.update(
        item.node.start,
        item.node.end,
        `export { ${item.names.join(', ')} } from ${JSON.stringify(item.source)};`,
      )
    }
  }
  if (!output.hasChanged()) {
    return
  }
  // TODO: return a sourcemap so callers can compose this pre-rewrite with
  // their follow-up proxy/wrap transform maps.
  return { code: output.toString() }
}

async function scanCurrentModule(
  bareStars: ExportAllDeclaration[],
  options: TransformExpandExportAllOptions,
): Promise<ModuleExportScan> {
  return scanModuleExports(options.ast, bareStars, options.importer, options)
}

function buildStarRewritePlan(scan: ModuleExportScan): StarRewritePlan[] {
  const starNameCounts = new Map<string, number>()
  for (const source of scan.starSources) {
    for (const name of new Set(source.names)) {
      starNameCounts.set(name, (starNameCounts.get(name) ?? 0) + 1)
    }
  }

  return scan.starSources.map((source) => ({
    node: source.node,
    source: source.source,
    names: source.names.filter(
      (name) =>
        name !== 'default' &&
        !scan.explicitNames.has(name) &&
        starNameCounts.get(name) === 1,
    ),
  }))
}

async function collectExportNames(
  resolvedId: string,
  options: TransformExpandExportAllOptions,
  seen: Set<string>,
): Promise<string[]> {
  if (seen.has(resolvedId)) return []
  seen.add(resolvedId)

  const ast = await options.load(resolvedId)
  const bareStars = ast.body.filter(
    (n): n is ExportAllDeclaration =>
      n.type === 'ExportAllDeclaration' && !n.exported,
  )
  const scan = await scanModuleExports(
    ast,
    bareStars,
    resolvedId,
    options,
    seen,
  )
  return collectVisibleExportNames(ast, buildStarRewritePlan(scan))
}

async function scanModuleExports(
  ast: Program,
  bareStars: ExportAllDeclaration[],
  importer: string,
  options: TransformExpandExportAllOptions,
  seen = new Set<string>(),
): Promise<ModuleExportScan> {
  const explicitNames = collectExplicitExportNames(ast)
  const starSources: StarExportSource[] = []

  for (const node of bareStars) {
    const source = node.source.value as string
    const resolved = await resolveExportAllSource(
      source,
      importer,
      node,
      options,
    )
    starSources.push({
      node,
      source,
      names: await collectExportNames(resolved, options, new Set(seen)),
    })
  }

  return { explicitNames, starSources }
}

function collectExplicitExportNames(ast: Program): Set<string> {
  const names = new Set<string>()
  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (
          node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration'
        ) {
          if (node.declaration.id) names.add(node.declaration.id.name)
        } else if (node.declaration.type === 'VariableDeclaration') {
          for (const decl of node.declaration.declarations) {
            for (const name of extractNames(decl.id)) {
              names.add(name)
            }
          }
        }
      } else {
        for (const spec of node.specifiers) {
          if (spec.exported.type === 'Identifier') {
            names.add(spec.exported.name)
          }
        }
      }
    } else if (node.type === 'ExportDefaultDeclaration') {
      names.add('default')
    } else if (node.type === 'ExportAllDeclaration') {
      if (node.exported?.type === 'Identifier') {
        names.add(node.exported.name)
      }
    }
  }
  return names
}

function collectVisibleExportNames(
  ast: Program,
  plan: StarRewritePlan[],
): string[] {
  const starNamesByNode = new Map(
    plan.map((item) => [item.node, item.names] as const),
  )
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
      } else {
        names.push(...(starNamesByNode.get(node) ?? []))
      }
    }
  }

  return names
}

async function resolveExportAllSource(
  source: string,
  importer: string,
  node: ExportAllDeclaration,
  options: TransformExpandExportAllOptions,
): Promise<string> {
  const resolved = await options.resolve(source, importer)
  if (!resolved) {
    throw Object.assign(
      new Error(
        `failed to resolve export-all source ${JSON.stringify(source)}`,
      ),
      { pos: node.start },
    )
  }
  return resolved
}
