import type { Node, Function as FunctionNode, MemberExpression } from 'estree'
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

export type NodeAnalysis = {
  scope: Scope
  map: WeakMap<Node, Scope>
}

export function analyze(root: Node): NodeAnalysis {
  const map = new WeakMap<Node, Scope>()
  const rootScope = new Scope(null, false)

  let scope = rootScope

  walk(root, {
    enter(node) {
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
    },

    leave(node: Node) {
      if (map.has(node) && scope.parent) {
        scope = scope.parent
      }
    },
  })

  return { map, scope: rootScope }
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

  const fnName = fnNode.type === 'FunctionDeclaration' && fnNode.id.name
  const fnParams = extractNames(fnNode.params)

  const fnDeclScope = programScope.map.get(fnNode)
  const fnBodyScope = programScope.map.get(fnNode.body)
  const fnScope = fnDeclScope ?? fnBodyScope ?? null

  let currentScope: Scope = fnBodyScope ?? programScope.scope
  walk(fnNode.body, {
    enter(node: Node, parent: Node | null) {
      if (node !== fnNode.body) {
        const s = programScope.map.get(node)
        if (s) currentScope = s
      }

      const isObjectOfNonComputedMember =
        parent?.type === 'MemberExpression' &&
        parent.object === node &&
        !parent.computed
      const isOutermostMemberExpr =
        node.type === 'MemberExpression' &&
        !node.computed &&
        !isObjectOfNonComputedMember

      let root: Node = node // e.g. `config` in `config.db.host`
      while (root.type === 'MemberExpression') root = root.object

      if (!isReference(root, parent)) return
      const name = root.name

      if (fnName && name === fnName) {
        isSelfReferencing = true
        return
      }

      if (fnParams.has(name)) return

      const ownerScope = currentScope.findOwner(name)
      if (
        !ownerScope ||
        ownerScope === programScope.scope ||
        isInsideFunctionBody(ownerScope, fnScope, programScope.scope)
      ) {
        // either undeclared, declared inside the function body, or in the root scope
        // not considered a capture for hoisting/binding purposes.
        return
      }

      if (!captures.has(name)) {
        captures.set(name, { isUsedBare: false, members: new Map() })
      }
      const usage = captures.get(name)!

      if (isOutermostMemberExpr) {
        if (usage.isUsedBare) return

        const pathKey = memberExprToPathKey(node)
        if (!usage.members.has(pathKey)) {
          usage.members.set(pathKey, [])
        }

        usage.members
          .get(pathKey)!
          .push({ start: node.start, end: node.end, suffix: '' })
      } else if (!isObjectOfNonComputedMember) {
        usage.isUsedBare = true
        // if a variable is used by itself, the entire variable must be bound instead
        // of individual member paths, so we stop tracking them.
        usage.members.clear()
      }
    },

    leave(node: Node) {
      if (node !== fnNode.body) {
        const s = programScope.map.get(node)
        if (s?.parent) currentScope = s.parent
      }
    },
  })

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
