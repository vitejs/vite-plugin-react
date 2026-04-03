import type {
  Node,
  Function as FunctionNode,
  MemberExpression,
  Identifier,
} from 'estree'
import { walk } from 'estree-walker'
import { isReference } from './is-reference'

export function extractNames(
  node: Node | Node[],
  idents: Set<string> = new Set<string>(),
): Set<string> {
  if (Array.isArray(node)) {
    for (const n of node) extractNames(n, idents)
    return idents
  }

  switch (node.type) {
    case 'Identifier':
      return idents.add(node.name)

    case 'MemberExpression': {
      let obj: Node = node
      // find root of member expr (e.g. `foo` in `foo.bar.baz = ...`)
      while (obj.type === 'MemberExpression') obj = obj.object
      return extractNames(obj, idents)
    }

    case 'ObjectPattern':
      for (const prop of node.properties) {
        switch (prop.type) {
          case 'Property':
            extractNames(prop.value, idents)
            break
          case 'RestElement':
            extractNames(prop.argument, idents)
            break
        }
      }
      break

    case 'ArrayPattern':
      for (const el of node.elements) {
        if (el) extractNames(el, idents)
      }
      break

    case 'RestElement':
      return extractNames(node.argument, idents)

    case 'AssignmentPattern':
      return extractNames(node.left, idents)
  }

  return idents
}

class Scope {
  public declarations: Set<string> = new Set()

  constructor(
    public parent: Scope | null,
    public isBlock: boolean,
  ) {}

  declare(name: string): void {
    this.declarations.add(name)
  }

  declareInFunctionScope(name: string): void {
    if (this.isBlock && this.parent) {
      return this.parent.declareInFunctionScope(name)
    }
    this.declare(name)
  }

  findOwner(name: string): Scope | null {
    if (this.declarations.has(name)) return this
    if (this.parent) return this.parent.findOwner(name)
    return null
  }
}

export type NodeReference = {
  node: MemberExpression | Identifier
  parent: Node | null
  rootIdentifier: Identifier
  scope: Scope
  /** Function node nesting at the point of the reference (outermost -> innermost) */
  fnStack: FunctionNode[]
}

export type NodeAnalysis = {
  scope: Scope
  map: WeakMap<Node, Scope>
  references: NodeReference[]
}

export function analyze(root: Node): NodeAnalysis {
  const map = new WeakMap<Node, Scope>()
  const rootScope = new Scope(null, false)
  const references: NodeReference[] = []

  let scope = rootScope

  const fnStack: FunctionNode[] = []

  walk(root, {
    enter(node, parent) {
      switch (node.type) {
        case 'ImportDeclaration':
          for (const spec of node.specifiers) {
            scope.declare(spec.local.name)
          }
          break

        case 'ExportAllDeclaration':
        case 'ExportNamedDeclaration':
          // re-exports don't get their own scope.
          break

        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression': {
          if (node.type === 'FunctionDeclaration' && node.id) {
            // function ref exists on the parent's scope with declarations
            scope.declare(node.id.name)
          }

          scope = new Scope(scope, false)
          map.set(node, scope)

          if (node.type === 'FunctionExpression' && node.id) {
            // function ref is visible in its own scope for recursion
            scope.declare(node.id.name)
          }

          for (const p of node.params) {
            for (const name of extractNames(p)) scope.declare(name)
          }

          fnStack.push(node)
          break
        }

        case 'BlockStatement':
        case 'ForStatement':
        case 'ForInStatement':
        case 'ForOfStatement': {
          scope = new Scope(scope, true)
          map.set(node, scope)
          break
        }

        case 'CatchClause': {
          scope = new Scope(scope, true)
          map.set(node, scope)
          if (node.param) {
            for (const name of extractNames(node.param)) scope.declare(name)
          }
          break
        }

        case 'VariableDeclaration': {
          for (const decl of node.declarations) {
            for (const name of extractNames(decl.id)) {
              if (node.kind === 'var') {
                scope.declareInFunctionScope(name)
              } else {
                scope.declare(name)
              }
            }
          }
          break
        }

        case 'ClassDeclaration': {
          if (node.id) scope.declare(node.id.name)
          break
        }
      }

      // we collect standalone identifiers, or the longest non-computed member
      // chain from it (e.g. `config.db.host` instead of just `config`)
      if (
        (node.type === 'Identifier' &&
          !isObjectOfNonComputedMember(node, parent)) ||
        isOutermostMemberExpr(node, parent)
      ) {
        let rootNode: Node = node
        while (rootNode.type === 'MemberExpression') rootNode = rootNode.object

        // the function identifier nodes are declarations, not references, but
        // `isReference` would consider them references because the identifier
        // is technically used in the function body, so we exclude them here
        const isFnIdentifier =
          rootNode === node &&
          (parent?.type === 'FunctionDeclaration' ||
            parent?.type === 'FunctionExpression') &&
          parent.id === node

        if (
          !isFnIdentifier &&
          rootNode.type === 'Identifier' &&
          isReference(rootNode, parent)
        ) {
          references.push({
            node,
            rootIdentifier: rootNode,
            scope,
            parent,
            fnStack: [...fnStack],
          })
        }
      }
    },

    leave(node: Node) {
      if (map.has(node) && scope.parent) {
        scope = scope.parent
      }

      if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
      ) {
        fnStack.pop()
      }
    },
  })

  return { map, scope: rootScope, references }
}

export type VariableUsage = {
  isUsedBare: boolean
  members: Map<string, Array<{ start: number; end: number; suffix: string }>>
}

export type FunctionCaptureAnalysis = {
  captures: Map<string, VariableUsage>
  isSelfReferencing: boolean
}

export function analyzeFunctionCaptures(
  fnNode: FunctionNode,
  programScope: NodeAnalysis,
): FunctionCaptureAnalysis {
  const captures = new Map<string, VariableUsage>()
  let isSelfReferencing = false

  const fnName =
    (fnNode.type === 'FunctionDeclaration' ||
      fnNode.type === 'FunctionExpression') &&
    fnNode.id?.name
  const fnParams = extractNames(fnNode.params)

  const fnDeclScope = programScope.map.get(fnNode)
  const fnBodyScope = programScope.map.get(fnNode.body)
  const fnScope = fnDeclScope ?? fnBodyScope ?? null

  for (const ref of programScope.references) {
    // filter references so that we only consider those that are inside the
    // function body, instead of re-walking it
    if (!ref.fnStack.includes(fnNode)) continue

    const name = ref.rootIdentifier.name

    if (fnName && name === fnName) {
      const fnNameOwnerScope =
        fnNode.type === 'FunctionExpression'
          ? (fnDeclScope ?? null)
          : (fnDeclScope?.parent ?? null)

      if (ref.scope.findOwner(fnName) === fnNameOwnerScope) {
        isSelfReferencing = true
      }
      continue
    }

    if (fnParams.has(name)) continue

    const ownerScope = ref.scope.findOwner(name)
    if (
      !ownerScope ||
      ownerScope === programScope.scope ||
      isInsideFunctionBody(ownerScope, fnScope, programScope.scope)
    ) {
      // either undeclared, declared inside the function body, or in the root scope
      // not considered a capture for hoisting/binding purposes.
      continue
    }

    if (!captures.has(name)) {
      captures.set(name, { isUsedBare: false, members: new Map() })
    }
    const usage = captures.get(name)!

    if (isOutermostMemberExpr(ref.node, ref.parent)) {
      if (usage.isUsedBare) continue

      const pathKey = memberExprToPathKey(ref.node)
      if (!usage.members.has(pathKey)) {
        usage.members.set(pathKey, [])
      }
      usage.members
        .get(pathKey)!
        .push({ start: ref.node.start, end: ref.node.end, suffix: '' })
    } else if (!isObjectOfNonComputedMember(ref.node, ref.parent)) {
      usage.isUsedBare = true
      // if a variable is used by itself, the entire variable must be bound instead
      // of individual member paths, so we stop tracking them.
      usage.members.clear()
    }
  }

  // de-duplicate captured member paths by prefix
  //
  // e.g. if both `config.cookies` and `config.cookies.names` are captured, we only
  // bind `config.cookies` and rewrite the `config.cookies.names` occurrence to
  // `$$bind_0_config_cookies.names` instead of binding both paths separately.

  for (const usage of captures.values()) {
    if (usage.isUsedBare || usage.members.size <= 1) continue

    const pathPrefixes = new Set<string>()
    const paths = [...usage.members.keys()].sort((a, b) => a.length - b.length)

    // we go from shortest path to longest, seeing if the current one is already
    // covered by a previously preserved shorter one for the de-duping.
    for (const path of paths) {
      let prefixedBy: string | undefined
      for (const prefix of pathPrefixes) {
        if (path.startsWith(prefix + '.')) {
          prefixedBy = prefix
          break
        }
      }

      if (prefixedBy !== undefined) {
        const suffix = path.slice(prefixedBy.length)
        const prefixMember = usage.members.get(prefixedBy)!
        for (const r of usage.members.get(path)!) {
          prefixMember.push({ start: r.start, end: r.end, suffix })
        }
        usage.members.delete(path)
      } else {
        pathPrefixes.add(path)
      }
    }
  }

  return { captures, isSelfReferencing }
}

function memberExprToPathKey(expr: MemberExpression): string {
  const parts: string[] = []

  let node: Node = expr
  while (node.type === 'MemberExpression') {
    if ('name' in node.property) parts.unshift(node.property.name)
    node = node.object
  }
  if (node.type === 'Identifier') parts.unshift(node.name)

  return parts.join('.')
}

function isInsideFunctionBody(
  scope: Scope,
  bodyScope: Scope | null,
  rootScope: Scope,
): boolean {
  let s: Scope | null = scope
  while (s) {
    if (s === bodyScope) return true
    if (s === rootScope) return false
    s = s.parent
  }
  return false
}

function isObjectOfNonComputedMember(node: Node, parent: Node | null): boolean {
  return (
    parent?.type === 'MemberExpression' &&
    parent.object === node &&
    !parent.computed
  )
}

function isOutermostMemberExpr(
  node: Node,
  parent: Node | null,
): node is MemberExpression {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    !isObjectOfNonComputedMember(node, parent)
  )
}
