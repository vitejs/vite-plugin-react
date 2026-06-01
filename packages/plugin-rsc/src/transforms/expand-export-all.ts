import type { ExportAllDeclaration, Program } from 'estree'
import MagicString from 'magic-string'
import { extractNames } from './utils'

export interface TransformExpandExportAllContext {
  resolve: (source: string, importer: string) => Promise<string | undefined>
  load: (id: string) => Promise<Program>
}

export interface TransformExpandExportAllOptions extends TransformExpandExportAllContext {
  code: string
  ast: Program
  importer: string
}

type ModuleExportScan = {
  explicitNames: Set<string>
  starSources: StarExportSource[]
}

type StarExportSource = {
  node: ExportAllDeclaration
  source: string
  scan: ExportNameScan
}

// `names` and `ambiguousNames` describe this module's star-visible export
// state. A name in `names` can be safely re-exported by a parent. A name in
// `ambiguousNames` must be propagated even though it is not visible, because a
// parent star export must also treat that name as ambiguous unless the parent
// defines it explicitly.
type ExportNameScan = {
  names: string[]
  ambiguousNames: Set<string>
}

type StarExportResolution = {
  ambiguousNames: Set<string>
  plans: StarExportRewritePlan[]
}

type StarExportRewritePlan = {
  node: ExportAllDeclaration
  source: string
  names: string[]
}

export async function transformExpandExportAll(
  options: TransformExpandExportAllOptions,
): Promise<{ code: string } | undefined> {
  const scan = await scanModuleExports(options.ast, options.importer, options)
  const { plans } = resolveStarExports(scan)
  if (plans.length === 0) {
    return
  }
  const output = new MagicString(options.code)
  for (const item of plans) {
    const newExport = `export {${item.names.join(', ')}} from ${JSON.stringify(item.source)};`
    output.update(item.node.start, item.node.end, newExport)
  }
  // TODO: return a sourcemap so callers can compose this pre-rewrite with
  // their follow-up proxy/wrap transform maps.
  return { code: output.toString() }
}

// Scan a module into local explicit exports and recursively scanned direct
// `export *` sources. This does not decide conflicts; resolveStarExports does.
async function scanModuleExports(
  ast: Program,
  importer: string,
  context: TransformExpandExportAllContext,
  seen = new Set<string>(),
): Promise<ModuleExportScan> {
  const starSources: StarExportSource[] = []
  const bareStars = ast.body.filter(
    (n): n is ExportAllDeclaration =>
      n.type === 'ExportAllDeclaration' && !n.exported,
  )

  for (const node of bareStars) {
    const source = node.source.value as string
    const resolved = await context.resolve(source, importer)
    if (!resolved) {
      throw Object.assign(
        new Error(
          `failed to resolve export-all source ${JSON.stringify(source)}`,
        ),
        { pos: node.start },
      )
    }
    starSources.push({
      node,
      source,
      scan: await collectExportScan(resolved, context, new Set(seen)),
    })
  }

  const explicitNames = collectExplicitExportNames(ast)
  return { explicitNames, starSources }
}

// Return the names that a resolved dependency visibly exports, plus names whose
// resolution is ambiguous and must continue to poison parent star resolution.
async function collectExportScan(
  resolvedId: string,
  context: TransformExpandExportAllContext,
  seen: Set<string>,
): Promise<ExportNameScan> {
  if (seen.has(resolvedId)) {
    // TODO: This module-level bailout is only a termination guard. A fully
    // spec-accurate resolver would track per-name resolution state and binding
    // identity, so cyclic paths that resolve to the same binding can survive.
    return { names: [], ambiguousNames: new Set() }
  }
  seen.add(resolvedId)

  const ast = await context.load(resolvedId)
  const scan = await scanModuleExports(ast, resolvedId, context, seen)
  const resolved = resolveStarExports(scan)
  const names = [
    ...scan.explicitNames,
    ...resolved.plans.flatMap((item) => item.names),
  ]
  return {
    names,
    ambiguousNames: resolved.ambiguousNames,
  }
}

// Collect names declared directly by the module, including namespace re-exports.
// These names shadow star exports at this module boundary.
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
          } else {
            throw new Error('unsupported string literal export name')
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

// Apply ESM export-star conflict rules for one module boundary and build the
// rewrite for each direct `export *`. Ambiguity from child modules is preserved
// so a parent does not accidentally make an invalid name explicit.
function resolveStarExports(scan: ModuleExportScan): StarExportResolution {
  const starNameCounts = new Map<string, number>()
  for (const source of scan.starSources) {
    for (const name of new Set(source.scan.names)) {
      if (name === 'default' || scan.explicitNames.has(name)) {
        continue
      }
      starNameCounts.set(name, (starNameCounts.get(name) ?? 0) + 1)
    }
  }

  const ambiguousNames = new Set<string>()
  for (const source of scan.starSources) {
    for (const name of source.scan.ambiguousNames) {
      if (!scan.explicitNames.has(name)) {
        ambiguousNames.add(name)
      }
    }
  }
  for (const [name, count] of starNameCounts) {
    if (count > 1) {
      ambiguousNames.add(name)
    }
  }

  const plans: StarExportRewritePlan[] = []
  for (const source of scan.starSources) {
    const names = source.scan.names.filter(
      (name) =>
        name !== 'default' &&
        !scan.explicitNames.has(name) &&
        !ambiguousNames.has(name),
    )
    plans.push({
      node: source.node,
      source: source.source,
      names,
    })
  }

  return {
    ambiguousNames,
    plans: plans,
  }
}
