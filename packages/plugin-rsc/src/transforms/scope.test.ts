import path from 'node:path'
import type { Node, Program } from 'estree'
import { walk } from 'estree-walker'
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
      await expect(snapshot).toMatchFileSnapshot(file + '.snap')
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

  // Build scope → label and scope → direct children.
  // Labels are disambiguated per parent (e.g. BlockStatement[2] for the second sibling).
  const scopeLabel = new Map<Scope, string>()
  const scopeChildren = new Map<Scope, Scope[]>()
  const siblingCount = new Map<Scope, Map<string, number>>()

  scopeLabel.set(moduleScope, 'Program')
  scopeChildren.set(moduleScope, [])

  walk(ast as Node, {
    enter(node) {
      const scope = nodeScope.get(node)
      if (!scope || scope === moduleScope) return

      const parent = scope.parent!
      const base = scopeNodeLabel(node)

      if (!siblingCount.has(parent)) siblingCount.set(parent, new Map())
      const counts = siblingCount.get(parent)!
      const n = (counts.get(base) ?? 0) + 1
      counts.set(base, n)

      scopeLabel.set(scope, n === 1 ? base : `${base}[${n}]`)

      if (!scopeChildren.has(parent)) scopeChildren.set(parent, [])
      scopeChildren.get(parent)!.push(scope)
      scopeChildren.set(scope, [])
    },
  })

  // Stable path string for a scope, used as the resolvedIn value.
  function fullPath(scope: Scope): string {
    const parts: string[] = []
    let curr: Scope | undefined = scope
    while (curr) {
      parts.unshift(scopeLabel.get(curr) ?? '?')
      curr = curr.parent
    }
    return parts.join(' > ')
  }

  // Direct references for a scope = all propagated refs minus those in child scopes.
  function directRefs(scope: Scope) {
    const allRefs = scopeToReferences.get(scope) ?? []
    const childRefSet = new Set(
      (scopeChildren.get(scope) ?? []).flatMap(
        (c) => scopeToReferences.get(c) ?? [],
      ),
    )
    return allRefs.filter((id) => !childRefSet.has(id))
  }

  function buildNode(scope: Scope): SerializedScope {
    const refs = directRefs(scope)
    return {
      type: scopeLabel.get(scope)!,
      declarations: [...scope.declarations].sort(),
      references: refs.map((id) => ({
        name: id.name,
        resolvedIn: referenceToDeclaredScope.has(id)
          ? fullPath(referenceToDeclaredScope.get(id)!)
          : null,
      })),
      children: (scopeChildren.get(scope) ?? []).map(buildNode),
    }
  }

  return JSON.stringify(buildNode(moduleScope), null, 2)
}

function scopeNodeLabel(node: Node): string {
  switch (node.type) {
    case 'FunctionDeclaration':
      return node.id ? `Function:${node.id.name}` : 'Function'
    case 'FunctionExpression':
      return node.id
        ? `FunctionExpression:${node.id.name}`
        : 'FunctionExpression'
    case 'ArrowFunctionExpression':
      return 'ArrowFunction'
    default:
      return node.type
  }
}
