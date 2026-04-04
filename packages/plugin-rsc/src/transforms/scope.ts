import type {
  Program,
  Identifier,
  Node,
  Pattern,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
} from 'estree'
import { walk } from 'estree-walker'
import { extractNames } from './utils'

// TODO: unit test
// Replacement for periscopic to correctly handle variable shadowing

export class Scope {
  readonly declarations: Set<string> = new Set<string>()

  constructor(
    public readonly parent: Scope | undefined,
    private readonly isFunction: boolean,
  ) {}

  getNearestFunctionScope(): Scope {
    return this.isFunction ? this : this.parent!.getNearestFunctionScope()
  }

  getAncestorScopes(): Set<Scope> {
    const ancestors = new Set<Scope>()
    let curr = this.parent
    while (curr) {
      ancestors.add(curr)
      curr = curr.parent
    }
    return ancestors
  }
}

export type ScopeTree = {
  // each reference Identifier → the Scope that declared it (absent = module-level/global)
  readonly referenceToDeclaredScope: WeakMap<Identifier, Scope>
  // each function Scope → reference Identifiers accessed within its scope
  readonly scopeToReferences: WeakMap<Scope, Identifier[]>
  // scope-creating AST node → its Scope (the only entry point from AST into Scope)
  readonly nodeScope: WeakMap<Node, Scope>
  readonly moduleScope: Scope
}

export function buildScopeTree(ast: Program): ScopeTree {
  const moduleScope = new Scope(undefined, true)
  const nodeScope = new WeakMap<Node, Scope>()

  // Inline resolution during the walk is wrong for `var`/function hoisting: a
  // reference that appears before its `var` declaration would resolve to an outer
  // binding rather than the locally-hoisted one.  The fix is to defer resolution
  // until after the walk, when all declarations are in the chain.  We collect
  // `{ id, visitScope }` pairs during the walk, then resolve them in a post-walk
  // loop by scanning up from `visitScope` — at that point the scope tree is
  // complete and the scan sees the correct picture.

  // ── Walk: collect declarations and raw reference pairs ───────────────────
  let current = moduleScope
  nodeScope.set(ast, moduleScope)

  const rawReferences: Array<{ id: Identifier; visitScope: Scope }> = []
  const ancestors: Node[] = []

  walk(ast, {
    enter(node, parent) {
      ancestors.push(node)
      if (node.type === 'ImportDeclaration') {
        for (const spec of node.specifiers) {
          current.declarations.add(spec.local.name)
        }
      } else if (isFunctionNode(node)) {
        // Declare the function name in the current scope (block or function).
        // In strict mode (ES modules), block-level function declarations are block-scoped.
        if (node.type === 'FunctionDeclaration' && node.id) {
          current.declarations.add(node.id.name)
        }
        // Param scope is separate from the body scope (BlockStatement below creates its own).
        // This matches the JS spec: params have their own environment, the body has another.
        const scope = new Scope(current, true)
        nodeScope.set(node, scope)
        current = scope
        for (const param of node.params) {
          for (const name of extractNames(param)) {
            scope.declarations.add(name)
          }
        }
        if (node.type === 'FunctionExpression' && node.id) {
          scope.declarations.add(node.id.name)
        }
      } else if (
        node.type === 'ForStatement' ||
        node.type === 'ForInStatement' ||
        node.type === 'ForOfStatement' ||
        node.type === 'SwitchStatement' ||
        node.type === 'BlockStatement'
      ) {
        const scope = new Scope(current, false)
        nodeScope.set(node, scope)
        current = scope
      } else if (node.type === 'CatchClause') {
        const scope = new Scope(current, false)
        nodeScope.set(node, scope)
        current = scope
        if (node.param) {
          for (const name of extractNames(node.param)) {
            scope.declarations.add(name)
          }
        }
      } else if (node.type === 'VariableDeclaration') {
        const target =
          node.kind === 'var' ? current.getNearestFunctionScope() : current
        for (const decl of node.declarations) {
          for (const name of extractNames(decl.id)) {
            target.declarations.add(name)
          }
        }
      } else if (node.type === 'ClassDeclaration' && node.id) {
        current.declarations.add(node.id.name)
      }
      // Collect reference identifiers for post-walk resolution.
      // TODO:
      // To extend to member-expression binding: instead of collecting just the
      // Identifier, collect the outermost non-computed MemberExpression rooted at
      // it (e.g. `x.y` in `x.y.z`) when one exists. The root
      // Identifier is still used for `referenceToDeclaredScope`; the full node
      // (Identifier | MemberExpression) goes into `scopeToReferences`. Then
      // `getBindVars` inspects each entry — if it is a MemberExpression, extract
      // the path key for binding instead of the bare name.
      if (
        node.type === 'Identifier' &&
        !isBindingIdentifier(
          node,
          parent ?? undefined,
          ancestors[ancestors.length - 3],
        )
      ) {
        rawReferences.push({ id: node, visitScope: current })
      }
    },
    leave(node) {
      ancestors.pop()
      const scope = nodeScope.get(node)
      if (scope?.parent) {
        current = scope.parent
      }
    },
  })

  // ── Post-walk fixup: resolve references against the complete scope tree ──
  const scopeToReferences = new WeakMap<Scope, Identifier[]>()
  const referenceToDeclaredScope = new WeakMap<Identifier, Scope>()

  for (const { id, visitScope } of rawReferences) {
    let declScope: Scope | undefined = visitScope
    while (declScope && !declScope.declarations.has(id.name)) {
      declScope = declScope.parent
    }
    if (declScope) {
      referenceToDeclaredScope.set(id, declScope)
    }
    // Propagate reference up through all ancestor scopes
    let scope: Scope | undefined = visitScope
    while (scope) {
      if (!scopeToReferences.has(scope)) {
        scopeToReferences.set(scope, [])
      }
      scopeToReferences.get(scope)!.push(id)
      scope = scope.parent
    }
  }

  return {
    referenceToDeclaredScope,
    scopeToReferences,
    nodeScope,
    moduleScope,
  }
}

type AnyFunctionNode =
  | FunctionDeclaration
  | FunctionExpression
  | ArrowFunctionExpression

function isFunctionNode(node: Node): node is AnyFunctionNode {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  )
}

// TODO: review
// Binding-position check aligned with oxc-walker's `isBindingIdentifier` in
// `src/scope-tracker.ts`, with ESTree-specific handling for `ExportSpecifier`
// because only `local` is a reference there.
function isBindingIdentifier(
  node: Identifier,
  parent?: Node,
  grandparent?: Node,
): boolean {
  if (!parent) return false
  switch (parent.type) {
    case 'VariableDeclarator':
      return patternContainsIdentifier(parent.id, node)
    case 'MemberExpression':
      return parent.property === node && !parent.computed
    case 'Property':
      // The value is always the binding in destructuring (both computed and non-computed).
      // The key is never a binding — in computed form `{ [expr]: b }` it is a reference.
      return grandparent?.type === 'ObjectPattern' && parent.value === node
    case 'FunctionDeclaration':
    case 'FunctionExpression':
      if (parent.id === node) return true
      return parent.params.some((param) =>
        patternContainsIdentifier(param, node),
      )
    case 'ArrowFunctionExpression':
      return parent.params.some((param) =>
        patternContainsIdentifier(param, node),
      )
    case 'ClassDeclaration':
    case 'ClassExpression':
      return parent.id === node
    case 'MethodDefinition':
    case 'PropertyDefinition':
      return parent.key === node && !parent.computed
    case 'CatchClause':
      return !!parent.param && patternContainsIdentifier(parent.param, node)
    case 'AssignmentPattern':
      return patternContainsIdentifier(parent.left, node)
    case 'RestElement':
      return patternContainsIdentifier(parent.argument, node)
    case 'ArrayPattern':
      return true
    case 'LabeledStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
      return false
    case 'ImportSpecifier':
      return parent.imported !== node
    case 'ImportDefaultSpecifier':
    case 'ImportNamespaceSpecifier':
      return true
    case 'ExportSpecifier':
      return parent.local !== node
    default:
      return false
  }
}

function patternContainsIdentifier(pattern: Pattern, target: Node): boolean {
  switch (pattern.type) {
    case 'Identifier':
      return pattern === target
    case 'MemberExpression':
      return pattern === target
    case 'ObjectPattern':
      return pattern.properties.some((prop) =>
        prop.type === 'RestElement'
          ? patternContainsIdentifier(prop.argument, target)
          : patternContainsIdentifier(prop.value, target),
      )
    case 'ArrayPattern':
      return pattern.elements.some(
        (element) => element && patternContainsIdentifier(element, target),
      )
    case 'RestElement':
      return patternContainsIdentifier(pattern.argument, target)
    case 'AssignmentPattern':
      return patternContainsIdentifier(pattern.left, target)
  }
}
