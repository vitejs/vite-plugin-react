import type {
  Program,
  Identifier,
  MemberExpression,
  Node,
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
  // each reference Identifier → outermost non-computed MemberExpression rooted at it, or the
  // Identifier itself when no such chain exists. Callee position trims the final segment so the
  // receiver is captured rather than the method property.
  readonly referenceToNode: Map<Identifier, Identifier | MemberExpression>
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
  const referenceToNode = new Map<Identifier, Identifier | MemberExpression>()

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
      // Additionally track member chain for hoist binding.
      if (
        node.type === 'Identifier' &&
        isReferenceIdentifier(node, ancestors.slice(0, -1).reverse())
      ) {
        const parentStack = ancestors.slice(0, -1).reverse()
        const bindableNode = getOutermostBindableReference(node, parentStack)
        referenceToNode.set(node, bindableNode)
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
    // TODO: default param expressions should not resolve to `var` declarations
    // from the same function body. We currently start lookup at `visitScope`,
    // so `function f(x = y) { var y }` incorrectly resolves `y` to `f`'s own
    // function scope instead of continuing to the parent scope.
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
    referenceToNode,
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
    // disregard the `x` in `function f(x) {}`
    if (parent.params.includes(node)) {
      return false
    }
  }

  // property key / class method / class field name
  // disregard the `foo` in `{ foo: bar }`, `class { foo() {} }` or `class { foo = bar }`,
  // but keep it in `{ [foo]: bar }``, `class { [foo]() {} }` or `class { [foo] = bar }`.
  if (
    (parent.type === 'MethodDefinition' ||
      parent.type === 'PropertyDefinition' ||
      parent.type === 'Property') &&
    parent.key === node &&
    !parent.computed
  ) {
    return false
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

  // meta property
  // disregard the `import`/`meta` in `import.meta`
  if (parent.type === 'MetaProperty') {
    return false
  }

  // Unlike Vite SSR, this walk does not pre-mark pattern nodes in a WeakSet,
  // so we use the ESTree parent stack directly to recognize object patterns.
  // disregard the `bar` in `const { foo: bar } = obj`, but keep it as a
  // reference in `({ foo: bar } = obj)`
  if (
    parent.type === 'Property' &&
    parent.value === node &&
    parentStack[1]?.type === 'ObjectPattern'
  ) {
    return isInDestructuringAssignment(parentStack)
  }

  // array destructuring pattern
  // disregard the `x` in `const [x] = value`, but keep it as a reference in
  // `([x] = value)`
  if (parent.type === 'ArrayPattern') {
    return isInDestructuringAssignment(parentStack)
  }

  // Unlike Vite SSR, this walk sees rest-pattern identifiers directly here.
  // disregard the `rest` in declarations or params, but keep it as a reference
  // in `({ ...rest } = value)` or `([...rest] = value)`
  if (parent.type === 'RestElement' && parent.argument === node) {
    return isInDestructuringAssignment(parentStack)
  }

  // Unlike Vite SSR, this walk classifies pattern/default nodes here instead of
  // relying on `handlePattern`, `setIsNodeInPattern`, and the separate param
  // traversal to classify them during traversal.
  // disregard the `x` in `function f(x = y) {}` or `const { x = y } = obj`,
  // but keep it as a reference in `({ x = y } = obj)` or `([x = y] = arr)`
  if (parent.type === 'AssignmentPattern' && parent.left === node) {
    return isInDestructuringAssignment(parentStack)
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

function isInDestructuringAssignment(parentStack: Node[]): boolean {
  // `ObjectPattern` / `ArrayPattern` alone is ambiguous: the same immediate
  // parent shape appears in declarations, params, and assignment targets.
  //
  // Treat as references:
  // - `x` in `[x] = value`
  // - `x` in `({ x } = value)`
  // - `x` in `({ a: [x] } = value)`
  //
  // Do not treat as references:
  // - `x` in `const [x] = value`
  // - `x` in `const { x } = value`
  // - `x` in `function f([x]) {}`
  // - `x` in `function f({ x }) {}`
  //
  // The distinction only appears higher in the ancestor chain, where assignment
  // targets are owned by an `AssignmentExpression`.
  return parentStack.some((node) => node.type === 'AssignmentExpression')
}

// TODO: review slop
// Walk up the parent stack collecting non-computed MemberExpression ancestors where the
// current node is the object. Stops at computed access, call boundaries, or any other node.
// In callee position, trims the final segment so we capture the receiver, not the method.
function getOutermostBindableReference(
  id: Identifier,
  parentStack: Node[], // [direct parent, grandparent, ...]
): Identifier | MemberExpression {
  // TODO: This currently accumulates only plain non-computed member chains.
  // Supporting optional chaining or computed access would require preserving
  // richer access metadata than `MemberExpression` + identifier-name segments.
  let current: Identifier | MemberExpression = id

  for (let i = 0; i < parentStack.length; i++) {
    const parent = parentStack[i]!
    if (
      parent.type === 'MemberExpression' &&
      !parent.computed &&
      parent.object === current
    ) {
      current = parent
    } else {
      // Callee trimming: if we accumulated a member chain and it sits in callee position,
      // drop the last segment and capture the receiver instead of the method property.
      if (
        current !== id &&
        current.type === 'MemberExpression' &&
        parent.type === 'CallExpression' &&
        parent.callee === current
      ) {
        const receiver = current.object
        current =
          receiver.type === 'Identifier' || receiver.type === 'MemberExpression'
            ? receiver
            : id
      }
      break
    }
  }

  return current
}
