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
  // each reference Identifier → the Scope that declared it (absent = undeclared i.e. assume global)
  readonly referenceToDeclaredScope: Map<Identifier, Scope>
  // each function Scope → reference Identifiers accessed within its scope
  readonly scopeToReferences: Map<Scope, Identifier[]>
  // scope-creating AST node → its Scope
  readonly nodeScope: Map<Node, Scope>
  readonly moduleScope: Scope
}

export function buildScopeTree(ast: Program): ScopeTree {
  const moduleScope = new Scope(undefined, true)
  const nodeScope = new Map<Node, Scope>()

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
    enter(node) {
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
      } else if (node.type === 'ClassDeclaration' && node.id) {
        current.declarations.add(node.id.name)
      } else if (node.type === 'ClassExpression' && node.id) {
        // Named class expressions have an inner self-binding visible from the
        // heritage clause and the class body, similar to named function expressions.
        const scope = new Scope(current, false)
        scope.declarations.add(node.id.name)
        nodeScope.set(node, scope)
        current = scope
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
        isReferenceIdentifier(node, ancestors.slice(0, -1).reverse())
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
  const scopeToReferences = new Map<Scope, Identifier[]>(
    [...nodeScope.values()].map((scope) => [scope, []]),
  )
  const referenceToDeclaredScope = new Map<Identifier, Scope>()

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

// TODO: review slop
// Positive reference classifier modeled after Vite SSR's `isRefIdentifier`,
// adapted for this ESTree-only scope walk. This is easier to audit than a
// negated binding check because many identifier positions are syntax-only names
// rather than bindings or references.
function isReferenceIdentifier(node: Identifier, parentStack: Node[]): boolean {
  const parent = parentStack[0]
  if (!parent) return true

  // declaration id
  // disregard the `x` in `let x = y`, `class X {}`, or `catch (x) {}`
  if (
    parent.type === 'CatchClause' ||
    ((parent.type === 'VariableDeclarator' ||
      parent.type === 'ClassDeclaration' ||
      parent.type === 'ClassExpression') &&
      parent.id === node)
  ) {
    return false
  }

  if (isFunctionNode(parent)) {
    // function declaration/expression id
    // disregard the `f` in `function f() {}` or `(function f() {})`
    if ('id' in parent && parent.id === node) {
      return false
    }

    // params list
    // disregard the `x` in `function f(x) {}` and nested binding patterns
    if (parent.params.some((param) => patternContainsIdentifier(param, node))) {
      return false
    }
  }

  // class method / class field name
  // disregard the `foo` in `class { foo() {} }` or `class { foo = bar }`,
  // but keep it in `class { [foo]() {} }` or `class { [foo] = bar }`
  if (
    (parent.type === 'MethodDefinition' ||
      parent.type === 'PropertyDefinition') &&
    parent.key === node &&
    !parent.computed
  ) {
    return false
  }

  // property key
  // disregard the `foo` in `{ foo: bar }`, but keep it in `{ [foo]: bar }`
  if (isStaticPropertyKey(node, parent)) {
    return false
  }

  // Unlike Vite SSR, this walk does not pre-mark pattern nodes in a WeakSet,
  // so we use the ESTree parent stack directly to recognize object patterns.
  // disregard the `bar` in `({ foo: bar } = obj)`, but keep it as a binding in
  // `const { foo: bar } = obj`
  if (
    parent.type === 'Property' &&
    parentStack[1]?.type === 'ObjectPattern' &&
    parent.value === node
  ) {
    return isInDestructuringAssignment(parentStack)
  }

  // array destructuring pattern
  // disregard the `x` in `[x] = value`, but keep it as a binding in
  // `const [x] = value`
  if (parent.type === 'ArrayPattern') {
    return isInDestructuringAssignment(parentStack)
  }

  // Unlike Vite SSR, this walk sees rest-pattern identifiers directly here.
  // Disregard the `rest` in `({ ...rest } = value)` or `[...rest] = value`,
  // but keep it as a binding in declarations or params.
  if (parent.type === 'RestElement' && parent.argument === node) {
    return isInDestructuringAssignment(parentStack)
  }

  // disregard the `x` in `({ x = y } = obj)` or `([x = y] = arr)`, but keep it
  // as a binding in `function f(x = y) {}` or `const { x = y } = obj`
  if (parent.type === 'AssignmentPattern' && parent.left === node) {
    return isInDestructuringAssignment(parentStack)
  }

  // member expression property
  // disregard the `bar` in `foo.bar`, but keep it in `foo[bar]`
  if (
    parent.type === 'MemberExpression' &&
    parent.property === node &&
    !parent.computed
  ) {
    return false
  }

  // Unlike Vite SSR, this walk does not skip ImportDeclaration up front, so
  // import specifier syntax has to be filtered here as well.
  // import/export specifier syntax names
  // disregard the `foo`/`bar` in `import foo from 'x'`, `import * as foo from 'x'`,
  // or `import { foo as bar } from 'x'`
  if (
    parent.type === 'ImportSpecifier' ||
    parent.type === 'ImportDefaultSpecifier' ||
    parent.type === 'ImportNamespaceSpecifier'
  ) {
    return false
  }

  // disregard the `bar` in `export { foo as bar }`, but keep the local `foo`
  if (parent.type === 'ExportSpecifier') {
    return parent.local === node
  }

  // Explicitly handled here because these labels showed up as false positives in
  // the scope fixtures; Vite SSR's helper does not need this branch.
  // label identifiers
  // disregard the `label` in `label: for (;;) {}`, `break label`, or
  // `continue label`
  if (
    parent.type === 'LabeledStatement' ||
    parent.type === 'BreakStatement' ||
    parent.type === 'ContinueStatement'
  ) {
    return false
  }

  return true
}

function isStaticPropertyKey(node: Node, parent?: Node): boolean {
  return parent?.type === 'Property' && parent.key === node && !parent.computed
}

function isInDestructuringAssignment(parentStack: Node[]): boolean {
  return parentStack.some((node) => node.type === 'AssignmentExpression')
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
