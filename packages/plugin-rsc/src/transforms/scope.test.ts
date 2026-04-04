import path from 'node:path'
import type { Node, Program } from 'estree'
import { parseAstAsync } from 'vite'
import { describe, expect, it } from 'vitest'
import { type Scope, type ScopeTree, buildScopeTree } from './scope'

describe('fixtures', () => {
  const fixtures = import.meta.glob('./fixtures/scope/*.js', { query: 'raw' })
  for (const [file, mod] of Object.entries(fixtures)) {
    it(path.basename(file), async () => {
      const input = ((await mod()) as any).default as string
      const ast = await parseAstAsync(input)
      const scopeTree = buildScopeTree(ast)
      const snapshot = serializeScopeTree(ast, scopeTree)
      await expect(snapshot).toMatchFileSnapshot(file + '.snap.json')
    })
  }
})

// TODO: review
// ── Serializer ────────────────────────────────────────────────────────────────

type SerializedScope = {
  type: string
  declarations: string[]
  references: Array<{ name: string; resolvedIn: string | null }>
  children: SerializedScope[]
}

function serializeScopeTree(ast: Program, scopeTree: ScopeTree): string {
  const {
    nodeScope,
    referenceToDeclaredScope,
    scopeToReferences,
    moduleScope,
  } = scopeTree

  // TODO: class DefaultMap helper
  // Build scope → label and scope → direct children.
  // Labels are disambiguated per parent (e.g. BlockStatement[2] for the second sibling).
  const scopeLabelMap = new Map<Scope, string>()
  const scopeChildrenMap = new Map<Scope, Scope[]>()
  const scopeNodeMap = new Map<Scope, Node>()
  const siblingCount = new Map<Scope, Map<string, number>>()

  scopeLabelMap.set(moduleScope, 'Program')
  scopeChildrenMap.set(moduleScope, [])
  scopeNodeMap.set(moduleScope, ast)

  for (const [node, scope] of nodeScope.entries()) {
    scopeNodeMap.set(scope, node)
    const base = scopeNodeLabel(node)
    if (!scope.parent) {
      continue
    }

    const parent = scope.parent

    if (!siblingCount.has(parent)) {
      siblingCount.set(parent, new Map())
    }
    const counts = siblingCount.get(parent)!
    const n = (counts.get(base) ?? 0) + 1
    counts.set(base, n)

    scopeLabelMap.set(scope, n === 1 ? base : `${base}[${n}]`)
    scopeNodeMap.set(scope, node)

    if (!scopeChildrenMap.has(parent)) {
      scopeChildrenMap.set(parent, [])
    }
    scopeChildrenMap.get(parent)!.push(scope)
    scopeChildrenMap.set(scope, [])
  }

  // Stable path string for a scope, used as the resolvedIn value.
  function fullPath(scope: Scope): string {
    const parts: string[] = []
    let curr: Scope | undefined = scope
    while (curr) {
      parts.unshift(scopeLabelMap.get(curr) ?? '?')
      curr = curr.parent
    }
    return parts.join(' > ')
  }

  // Direct references for a scope = all propagated refs minus those in child scopes.
  function directReferences(scope: Scope) {
    const allRefs = scopeToReferences.get(scope) ?? []
    const childRefSet = new Set(
      (scopeChildrenMap.get(scope) ?? []).flatMap(
        (c) => scopeToReferences.get(c) ?? [],
      ),
    )
    return allRefs.filter((id) => !childRefSet.has(id))
  }

  function buildNode(scope: Scope): SerializedScope {
    const refs = directReferences(scope)
    return {
      type: scopeLabelMap.get(scope)!,
      declarations: [...scope.declarations].sort(),
      references: refs.map((id) => ({
        name: id.name,
        resolvedIn: referenceToDeclaredScope.has(id)
          ? fullPath(referenceToDeclaredScope.get(id)!)
          : null,
      })),
      children: (scopeChildrenMap.get(scope) ?? []).map(buildNode),
    }
  }

  return JSON.stringify(buildNode(moduleScope), null, 2)
}

function scopeNodeLabel(node: Node): string {
  switch (node.type) {
    case 'FunctionDeclaration':
      return `${node.type}:${node.id.name}`
    case 'FunctionExpression':
      return node.type + (node.id ? `:${node.id.name}` : '')
    case 'ArrowFunctionExpression':
      return 'ArrowFunction'
    default:
      return node.type
  }
}
