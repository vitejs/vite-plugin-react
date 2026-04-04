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

        const bindVars = getBindVars(node, declName, scopeTree)
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
    public readonly parent: Scope | null,
    private readonly isFunction: boolean,
  ) {}

  nearestFunction(): Scope {
    return this.isFunction ? this : this.parent!.nearestFunction()
  }
}

type ScopeTree = {
  // each reference Identifier → the Scope that declared it (absent = module-level/global)
  readonly identifierScope: WeakMap<Identifier, Scope>
  // each function Scope → direct reference Identifiers within its body (not nested fns)
  readonly scopeToReferences: WeakMap<Scope, Identifier[]>
  // scope-creating AST node → its Scope (the only entry point from AST into Scope)
  readonly nodeScope: WeakMap<Node, Scope>
  readonly moduleScope: Scope
}

function buildScopeTree(ast: Program): ScopeTree {
  const moduleScope = new Scope(null, true)
  const nodeScope = new WeakMap<Node, Scope>()
  const identifierScope = new WeakMap<Identifier, Scope>()
  const scopeToReferences = new WeakMap<Scope, Identifier[]>()

  nodeScope.set(ast, moduleScope)
  scopeToReferences.set(moduleScope, [])

  // ── Pass 1: collect all declarations into scope nodes ───────────────────
  let current = moduleScope

  walk(ast, {
    enter(node, parent) {
      if (isFunctionNode(node)) {
        // Hoist function declaration name to the enclosing function scope
        if (node.type === 'FunctionDeclaration' && node.id) {
          current.nearestFunction().declarations.add(node.id.name)
        }
        const scope = new Scope(current, true)
        nodeScope.set(node, scope)
        scopeToReferences.set(scope, [])
        current = scope
        // Params and body share one scope — the key fix over periscopic
        for (const param of node.params) {
          for (const name of extractNames(param)) scope.declarations.add(name)
        }
        if (node.type === 'FunctionExpression' && node.id) {
          scope.declarations.add(node.id.name)
        }
      } else if (
        node.type === 'BlockStatement' &&
        !(parent && isFunctionNode(parent))
      ) {
        const scope = new Scope(current, false)
        nodeScope.set(node, scope)
        current = scope
      } else if (node.type === 'CatchClause') {
        const scope = new Scope(current, false)
        nodeScope.set(node, scope)
        current = scope
        if (node.param) {
          for (const name of extractNames(node.param))
            scope.declarations.add(name)
        }
      } else if (node.type === 'VariableDeclaration') {
        const target = node.kind === 'var' ? current.nearestFunction() : current
        for (const decl of node.declarations) {
          for (const name of extractNames(decl.id))
            target.declarations.add(name)
        }
      } else if (node.type === 'ClassDeclaration' && node.id) {
        current.declarations.add(node.id.name)
      }
    },
    leave(node) {
      const scope = nodeScope.get(node)
      if (scope?.parent) current = scope.parent
    },
  })

  // ── Pass 2: resolve each reference Identifier to its declaring Scope ────
  current = moduleScope
  const fnStack: Scope[] = [moduleScope]

  walk(ast, {
    enter(node, parent) {
      const scope = nodeScope.get(node)
      if (scope) {
        current = scope
        if (isFunctionNode(node)) fnStack.push(scope)
      }

      if (
        node.type === 'Identifier' &&
        isReferenceId(node, parent ?? undefined)
      ) {
        // Scan up from current scope to find where this name is declared
        let declaring: Scope | null = current
        while (declaring && !declaring.declarations.has(node.name)) {
          declaring = declaring.parent
        }
        // Record declaration scope (absent from map = module-level or undeclared)
        if (declaring && declaring !== moduleScope) {
          identifierScope.set(node, declaring)
        }
        // Add to the direct references of the enclosing function scope
        scopeToReferences.get(fnStack[fnStack.length - 1]!)!.push(node)
      }
    },
    leave(node) {
      const scope = nodeScope.get(node)
      if (scope?.parent) {
        current = scope.parent
        if (isFunctionNode(node)) fnStack.pop()
      }
    },
  })

  return { identifierScope, scopeToReferences, nodeScope, moduleScope }
}

// getBindVars is pure data lookup — no walking, no string matching.
function getBindVars(
  fn: AnyFunctionNode,
  declName: string | false,
  { identifierScope, scopeToReferences, nodeScope, moduleScope }: ScopeTree,
): string[] {
  const fnScope = nodeScope.get(fn)!
  const references = scopeToReferences.get(fnScope) ?? []
  return [
    ...new Set(
      references
        .filter((id) => id.name !== declName)
        .filter((id) => {
          const scope = identifierScope.get(id)
          return (
            scope !== undefined &&
            scope !== moduleScope &&
            isStrictAncestor(scope, fnScope)
          )
        })
        .map((id) => id.name),
    ),
  ]
}

// Is `candidate` a strict ancestor of `scope` in the parent chain?
function isStrictAncestor(candidate: Scope, scope: Scope): boolean {
  let curr = scope.parent
  while (curr) {
    if (curr === candidate) return true
    curr = curr.parent
  }
  return false
}

function isReferenceId(node: Node, parent?: Node): boolean {
  if (!parent) return true
  switch (parent.type) {
    case 'VariableDeclarator':
      return parent.id !== node
    case 'MemberExpression':
      return parent.computed || parent.object === node
    case 'Property':
      return parent.computed || parent.value === node
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ClassDeclaration':
    case 'ClassExpression':
      return parent.id !== node
    case 'AssignmentPattern':
      return parent.right === node
    case 'RestElement':
    case 'ArrayPattern':
      return false
    case 'LabeledStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
      return false
    case 'ImportSpecifier':
    case 'ImportDefaultSpecifier':
    case 'ImportNamespaceSpecifier':
    case 'ExportSpecifier':
      return false
    default:
      return true
  }
}

// Copied from periscopic — extract binding names from a pattern node
function extractNames(param: Pattern): string[] {
  const names: string[] = []
  extractIdentifiers(param, names)
  return names
}

function extractIdentifiers(param: Pattern, names: string[]): void {
  switch (param.type) {
    case 'Identifier':
      names.push(param.name)
      break
    case 'MemberExpression': {
      // TODO: review
      let obj = param as any
      while (obj.type === 'MemberExpression') {
        obj = obj.object
      }
      names.push(obj.name)
      break
    }
    case 'ObjectPattern':
      for (const prop of param.properties) {
        extractIdentifiers(
          prop.type === 'RestElement' ? prop : prop.value,
          names,
        )
      }
      break
    case 'ArrayPattern':
      for (const el of param.elements) {
        if (el) extractIdentifiers(el, names)
      }
      break
    case 'RestElement':
      extractIdentifiers(param.argument, names)
      break
    case 'AssignmentPattern':
      extractIdentifiers(param.left, names)
      break
  }
}
