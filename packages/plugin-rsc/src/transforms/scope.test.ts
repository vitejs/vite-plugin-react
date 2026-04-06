import path from 'node:path'
import type { Identifier, MemberExpression, Node } from 'estree'
import { parseAstAsync } from 'vite'
import { describe, expect, it } from 'vitest'
import { type Scope, type ScopeTree, buildScopeTree } from './scope'

// TODO:
// - use single markdown as snaphsot? (cf. review-scope-fixtures.ts)

describe('fixtures', () => {
  const fixtures = import.meta.glob('./fixtures/scope/**/*.js', {
    query: 'raw',
  })
  for (const [file, mod] of Object.entries(fixtures)) {
    it(path.basename(file), async () => {
      const input = ((await mod()) as any).default as string
      const ast = await parseAstAsync(input)
      const scopeTree = buildScopeTree(ast)
      const showReferenceNode = file.includes('/scope/reference-node/')
      const serialized = serializeScopeTree(scopeTree, { showReferenceNode })
      await expect(
        JSON.stringify(serialized, null, 2) + '\n',
      ).toMatchFileSnapshot(file + '.snap.json')
    })
  }
})

// ── Serializer ────────────────────────────────────────────────────────────────

type SerializedScope = {
  type: string
  declarations: string[]
  references: SerializedReference[]
  children: SerializedScope[]
}

type SerializedReference = {
  name: string
  declaredAt: string | null
  referenceNode?: string
}

function serializeScopeTree(
  scopeTree: ScopeTree,
  options?: {
    showReferenceNode?: boolean
  },
): SerializedScope {
  const {
    nodeScope,
    referenceToDeclaredScope,
    referenceToNode,
    scopeToReferences,
    moduleScope,
  } = scopeTree

  // Build scope → label and scope → direct children.
  // Labels are disambiguated per parent (e.g. BlockStatement[2] for the second sibling).
  const scopeLabelMap = new Map<Scope, string>()
  const scopeChildrenMap = new DefaultMap<Scope, Scope[]>(() => [])
  const siblingCount = new DefaultMap<Scope, DefaultMap<string, number>>(
    () => new DefaultMap(() => 0),
  )

  for (const [node, scope] of nodeScope.entries()) {
    const base = toScopeNodeLabel(node)
    scopeLabelMap.set(scope, base)
    scopeChildrenMap.set(scope, [])
    if (!scope.parent) {
      continue
    }
    const parent = scope.parent
    const counts = siblingCount.get(parent)
    const n = counts.get(base) + 1
    counts.set(base, n)
    scopeLabelMap.set(scope, n === 1 ? base : `${base}[${n}]`)
    scopeChildrenMap.get(parent).push(scope)
  }

  // Direct references for a scope = all propagated refs minus those in child scopes.
  function getDirectReferences(scope: Scope) {
    const allRefs = scopeToReferences.get(scope) ?? []
    const childRefSet = new Set(
      scopeChildrenMap
        .get(scope)
        .flatMap((c) => scopeToReferences.get(c) ?? []),
    )
    return allRefs.filter((id) => !childRefSet.has(id))
  }

  function serializeDeclaredPath(id: Identifier): string | null {
    const declScope = referenceToDeclaredScope.get(id)
    if (!declScope) {
      return null
    }
    const scopes = [declScope, ...declScope.getAncestorScopes()].reverse()
    return scopes.map((s) => scopeLabelMap.get(s)!).join(' > ')
  }

  function serializeReferenceNode(node: Identifier | MemberExpression): string {
    if (node.type === 'Identifier') {
      return node.name
    }
    // <unknown>/computed/optional shouldn't show up
    // since they aren't collected as reference node yet.
    const object =
      node.object.type === 'Identifier' ||
      node.object.type === 'MemberExpression'
        ? serializeReferenceNode(node.object)
        : '<unknown>'
    const property =
      node.property.type === 'Identifier' ? node.property.name : '<unknown>'
    const suffix = node.computed
      ? `${node.optional ? '?.' : ''}[${property}]`
      : `${node.optional ? '?.' : '.'}${property}`
    return object + suffix
  }

  function serializeScope(scope: Scope): SerializedScope {
    return {
      type: scopeLabelMap.get(scope)!,
      declarations: [...scope.declarations].sort(),
      references: getDirectReferences(scope).map((id) => {
        const reference: SerializedReference = {
          name: id.name,
          declaredAt: serializeDeclaredPath(id),
        }
        if (options?.showReferenceNode) {
          reference.referenceNode = serializeReferenceNode(
            referenceToNode.get(id)!,
          )
        }
        return reference
      }),
      children: scopeChildrenMap
        .get(scope)!
        .map((child) => serializeScope(child)),
    }
  }

  return serializeScope(moduleScope)
}

function toScopeNodeLabel(node: Node): string {
  switch (node.type) {
    case 'FunctionDeclaration':
      // ESTree typing says `id` is present here, but the parser can still produce
      // `export default function () {}` as a FunctionDeclaration with `id: null`.
      return node.type + (node.id ? `:${node.id.name}` : '')
    case 'FunctionExpression':
      return node.type + (node.id ? `:${node.id.name}` : '')
    case 'ClassDeclaration':
      return node.type + (node.id ? `:${node.id.name}` : '')
    case 'ClassExpression':
      return node.type + (node.id ? `:${node.id.name}` : '')
    case 'ArrowFunctionExpression':
      return 'ArrowFunction'
    default:
      return node.type
  }
}

class DefaultMap<K, V> extends Map<K, V> {
  constructor(private readonly init: (key: K) => V) {
    super()
  }

  override get(key: K): V {
    let value = super.get(key)
    if (value !== undefined) {
      return value
    }
    value = this.init(key)
    this.set(key, value)
    return value
  }
}
