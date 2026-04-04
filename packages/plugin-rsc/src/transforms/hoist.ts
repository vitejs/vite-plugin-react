import type {
  Program,
  Literal,
  Identifier,
  Node,
  Pattern,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
} from 'estree'
import { walk } from 'estree-walker'
import MagicString from 'magic-string'

export function transformHoistInlineDirective(
  input: string,
  ast: Program,
  {
    runtime,
    rejectNonAsyncFunction,
    ...options
  }: {
    runtime: (
      value: string,
      name: string,
      meta: { directiveMatch: RegExpMatchArray },
    ) => string
    directive: string | RegExp
    rejectNonAsyncFunction?: boolean
    encode?: (value: string) => string
    decode?: (value: string) => string
    noExport?: boolean
  },
): {
  output: MagicString
  names: string[]
} {
  // ensure ending space so we can move node at the end without breaking magic-string
  if (!input.endsWith('\n')) {
    input += '\n'
  }
  const output = new MagicString(input)
  const directive =
    typeof options.directive === 'string'
      ? exactRegex(options.directive)
      : options.directive

  const scopeTree = buildScopeTree(ast)
  const names: string[] = []

  walk(ast, {
    enter(node, parent) {
      if (
        (node.type === 'FunctionExpression' ||
          node.type === 'FunctionDeclaration' ||
          node.type === 'ArrowFunctionExpression') &&
        node.body.type === 'BlockStatement'
      ) {
        const match = matchDirective(node.body.body, directive)?.match
        if (!match) return
        if (!node.async && rejectNonAsyncFunction) {
          throw Object.assign(
            new Error(`"${directive}" doesn't allow non async function`),
            {
              pos: node.start,
            },
          )
        }

        const declName = node.type === 'FunctionDeclaration' && node.id.name
        const originalName =
          declName ||
          (parent?.type === 'VariableDeclarator' &&
            parent.id.type === 'Identifier' &&
            parent.id.name) ||
          'anonymous_server_function'

        const bindVars = getBindVars(node, scopeTree)
        let newParams = [
          ...bindVars,
          ...node.params.map((n) => input.slice(n.start, n.end)),
        ].join(', ')
        if (bindVars.length > 0 && options.decode) {
          newParams = [
            '$$hoist_encoded',
            ...node.params.map((n) => input.slice(n.start, n.end)),
          ].join(', ')
          output.appendLeft(
            node.body.body[0]!.start,
            `const [${bindVars.join(',')}] = ${options.decode(
              '$$hoist_encoded',
            )};\n`,
          )
        }

        // append a new `FunctionDeclaration` at the end
        const newName =
          `$$hoist_${names.length}` + (originalName ? `_${originalName}` : '')
        names.push(newName)
        output.update(
          node.start,
          node.body.start,
          `\n;${options.noExport ? '' : 'export '}${
            node.async ? 'async ' : ''
          }function ${newName}(${newParams}) `,
        )
        output.appendLeft(
          node.end,
          `;\n/* #__PURE__ */ Object.defineProperty(${newName}, "name", { value: ${JSON.stringify(
            originalName,
          )} });\n`,
        )
        output.move(node.start, node.end, input.length)

        // replace original declartion with action register + bind
        let newCode = `/* #__PURE__ */ ${runtime(newName, newName, {
          directiveMatch: match,
        })}`
        if (bindVars.length > 0) {
          const bindArgs = options.encode
            ? options.encode('[' + bindVars.join(', ') + ']')
            : bindVars.join(', ')
          newCode = `${newCode}.bind(null, ${bindArgs})`
        }
        if (declName) {
          newCode = `const ${declName} = ${newCode};`
          if (parent?.type === 'ExportDefaultDeclaration') {
            output.remove(parent.start, node.start)
            newCode = `${newCode}\nexport default ${declName};`
          }
        }
        output.appendLeft(node.start, newCode)
      }
    },
  })

  return {
    output,
    names,
  }
}

const exactRegex = (s: string): RegExp =>
  new RegExp('^' + s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$')

function matchDirective(
  body: Program['body'],
  directive: RegExp,
): { match: RegExpMatchArray; node: Literal } | undefined {
  for (const stmt of body) {
    if (
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'Literal' &&
      typeof stmt.expression.value === 'string'
    ) {
      const match = stmt.expression.value.match(directive)
      if (match) {
        return { match, node: stmt.expression }
      }
    }
  }
}

export function findDirectives(ast: Program, directive: string): Literal[] {
  const directiveRE = exactRegex(directive)
  const nodes: Literal[] = []
  walk(ast, {
    enter(node) {
      if (node.type === 'Program' || node.type === 'BlockStatement') {
        const match = matchDirective(node.body, directiveRE)
        if (match) {
          nodes.push(match.node)
        }
      }
    },
  })
  return nodes
}

// TODO: unit test
// ── Custom scope analysis (prototype) ─────────────────────────────────────────
// Replacement for periscopic's analyze() to correctly handle variable shadowing.
// See docs/notes/2026-04-04-hoist-variable-shadowing.md

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

// Scope is an identity token with a parent link.
// declarations is an internal build-time detail used only within buildScopeTree.
class Scope {
  readonly declarations = new Set<string>()

  constructor(
    public readonly parent: Scope | undefined,
    private readonly isFunction: boolean,
  ) {}

  nearestFunction(): Scope {
    return this.isFunction ? this : this.parent!.nearestFunction()
  }
}

type ScopeTree = {
  // each reference Identifier → the Scope that declared it (absent = module-level/global)
  readonly referenceToDeclaredScope: WeakMap<Identifier, Scope>
  // each function Scope → reference Identifiers accessed within its scope
  readonly scopeToReferences: WeakMap<Scope, Identifier[]>
  // scope-creating AST node → its Scope (the only entry point from AST into Scope)
  readonly nodeScope: WeakMap<Node, Scope>
  readonly moduleScope: Scope
}

function buildScopeTree(ast: Program): ScopeTree {
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

  const rawRefs: Array<{ id: Identifier; visitScope: Scope }> = []
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
        const target = node.kind === 'var' ? current.nearestFunction() : current
        for (const decl of node.declarations) {
          for (const name of extractNames(decl.id)) {
            target.declarations.add(name)
          }
        }
      } else if (node.type === 'ClassDeclaration' && node.id) {
        current.declarations.add(node.id.name)
      }
      if (
        node.type === 'Identifier' &&
        !isBindingIdentifier(
          node,
          parent ?? undefined,
          ancestors[ancestors.length - 3],
        )
      ) {
        rawRefs.push({ id: node, visitScope: current })
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

  for (const { id, visitScope } of rawRefs) {
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

function getBindVars(fn: AnyFunctionNode, scopeTree: ScopeTree): string[] {
  const fnScope = scopeTree.nodeScope.get(fn)!
  const ancestorScopes = getAncestorScopes(fnScope)
  const references = scopeTree.scopeToReferences.get(fnScope) ?? []
  // bind variables that are the ones declared in ancestor scopes but not module global scope
  const bindReferences = references.filter((id) => {
    const scope = scopeTree.referenceToDeclaredScope.get(id)
    return scope && scope !== scopeTree.moduleScope && ancestorScopes.has(scope)
  })
  return [...new Set(bindReferences.map((id) => id.name))]
}

function getAncestorScopes(scope: Scope): Set<Scope> {
  const ancestors = new Set<Scope>()
  let curr = scope.parent
  while (curr) {
    ancestors.add(curr)
    curr = curr.parent
  }
  return ancestors
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

// Copied from periscopic `extract_names` / `extract_identifiers` in `src/index.js`.
function extractNames(param: Pattern): string[] {
  const nodes = extractIdentifiers(param)
  return nodes.map((n) => n.name)
}

// TODO: review
function extractIdentifiers(
  param: Pattern,
  nodes: Identifier[] = [],
): Identifier[] {
  switch (param.type) {
    case 'Identifier':
      nodes.push(param)
      break
    case 'MemberExpression': {
      let obj = param as any
      while (obj.type === 'MemberExpression') {
        obj = obj.object
      }
      nodes.push(obj)
      break
    }
    case 'ObjectPattern':
      for (const prop of param.properties) {
        extractIdentifiers(
          prop.type === 'RestElement' ? prop : prop.value,
          nodes,
        )
      }
      break
    case 'ArrayPattern':
      for (const el of param.elements) {
        if (el) {
          extractIdentifiers(el, nodes)
        }
      }
      break
    case 'RestElement':
      extractIdentifiers(param.argument, nodes)
      break
    case 'AssignmentPattern':
      extractIdentifiers(param.left, nodes)
      break
  }
  return nodes
}
