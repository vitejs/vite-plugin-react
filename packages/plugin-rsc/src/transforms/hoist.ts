import { tinyassert } from '@hiogawa/utils'
import type {
  Program,
  Literal,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
} from 'estree'
import { walk } from 'estree-walker'
import MagicString from 'magic-string'
import { analyze } from 'periscopic'

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

  // re-export somehow confuses periscopic scopes so remove them before analysis
  walk(ast, {
    enter(node) {
      if (node.type === 'ExportAllDeclaration') {
        this.remove()
      }
      if (node.type === 'ExportNamedDeclaration' && !node.declaration) {
        this.remove()
      }
    },
  })

  const analyzed = analyze(ast)
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

        const scope = analyzed.map.get(node)
        tinyassert(scope)
        const declName = node.type === 'FunctionDeclaration' && node.id.name
        const originalName =
          declName ||
          (parent?.type === 'VariableDeclarator' &&
            parent.id.type === 'Identifier' &&
            parent.id.name) ||
          'anonymous_server_function'

        // bind variables which are neither global nor in own scope
        const bindVars = [...scope.references].filter((ref) => {
          // declared function itself is included as reference
          if (ref === declName) {
            return false
          }
          const owner = scope.find_owner(ref)
          return owner && owner !== scope && owner !== analyzed.scope
        })
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

function isFunctionNode(node: any): node is AnyFunctionNode {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  )
}

class OwnScope {
  declarations = new Set<string>()

  constructor(
    public readonly parent: OwnScope | null,
    public readonly isFunction: boolean,
  ) {}

  findOwner(name: string): OwnScope | null {
    if (this.declarations.has(name)) return this
    return this.parent?.findOwner(name) ?? null
  }

  nearestFunction(): OwnScope {
    return this.isFunction ? this : this.parent!.nearestFunction()
  }
}

// First pass: walk the whole module and build a scope tree.
// Returns the module-level scope and a map from scope-creating nodes to their scopes.
function buildScopeTree(ast: Program): {
  moduleScope: OwnScope
  nodeToScope: WeakMap<object, OwnScope>
} {
  const moduleScope = new OwnScope(null, true)
  const nodeToScope = new WeakMap<object, OwnScope>()
  nodeToScope.set(ast, moduleScope)
  let current = moduleScope

  walk(ast, {
    enter(node, parent) {
      const n = node as any
      const p = parent as any

      if (isFunctionNode(n)) {
        // Hoist function declaration name to the enclosing function scope
        if (n.type === 'FunctionDeclaration' && n.id) {
          current.nearestFunction().declarations.add(n.id.name)
        }
        const scope = new OwnScope(current, true)
        nodeToScope.set(node, scope)
        current = scope
        // Params belong to the function scope (not a separate block scope — this
        // is the key fix over periscopic which separates params from body)
        for (const param of n.params) {
          for (const name of ownExtractNames(param)) {
            scope.declarations.add(name)
          }
        }
        // FunctionExpression name is scoped to its own body
        if (n.type === 'FunctionExpression' && n.id) {
          scope.declarations.add(n.id.name)
        }
      } else if (n.type === 'BlockStatement' && !isFunctionNode(p)) {
        // Block scope — but skip the direct body BlockStatement of a function,
        // which is already covered by the function's own scope above
        const scope = new OwnScope(current, false)
        nodeToScope.set(node, scope)
        current = scope
      } else if (n.type === 'CatchClause') {
        const scope = new OwnScope(current, false)
        nodeToScope.set(node, scope)
        current = scope
        if (n.param) {
          for (const name of ownExtractNames(n.param)) {
            scope.declarations.add(name)
          }
        }
      } else if (n.type === 'VariableDeclaration') {
        const target = n.kind === 'var' ? current.nearestFunction() : current
        for (const decl of n.declarations) {
          for (const name of ownExtractNames(decl.id)) {
            target.declarations.add(name)
          }
        }
      } else if (n.type === 'ClassDeclaration' && n.id) {
        current.declarations.add(n.id.name)
      }
    },
    leave(node) {
      const scope = nodeToScope.get(node)
      if (scope && node !== ast) {
        current = scope.parent!
      }
    },
  })

  return { moduleScope, nodeToScope }
}

// Second pass: walk the server function body and collect variables that resolve
// to a scope strictly between the function and the module root (i.e. closures).
function getOwnBindVars(
  fn: AnyFunctionNode,
  declName: string | false,
  moduleScope: OwnScope,
  nodeToScope: WeakMap<object, OwnScope>,
): string[] {
  const fnScope = nodeToScope.get(fn)!
  const result = new Set<string>()
  let current = fnScope

  walk(fn.body as any, {
    enter(node, parent) {
      const n = node as any
      const p = parent as any

      // Skip nested functions — they handle their own binding
      if (isFunctionNode(n)) {
        this.skip()
        return
      }

      const scope = nodeToScope.get(node)
      if (scope) current = scope

      if (
        n.type === 'Identifier' &&
        n.name !== declName &&
        isReferenceId(n, p)
      ) {
        const owner = current.findOwner(n.name)
        if (owner && isIntermediateScope(owner, fnScope, moduleScope)) {
          result.add(n.name)
        }
      }
    },
    leave(node) {
      const scope = nodeToScope.get(node)
      if (scope) current = scope.parent ?? fnScope
    },
  })

  return [...result]
}

// Is `owner` strictly between `fnScope` and `moduleScope` in the ancestor chain?
function isIntermediateScope(
  owner: OwnScope,
  fnScope: OwnScope,
  moduleScope: OwnScope,
): boolean {
  if (owner === moduleScope) return false
  let curr = fnScope.parent
  while (curr) {
    if (curr === owner) return true
    curr = curr.parent
  }
  return false
}

function isReferenceId(node: any, parent: any): boolean {
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
function ownExtractNames(param: any): string[] {
  const names: string[] = []
  ownExtractIdentifiers(param, names)
  return names
}

function ownExtractIdentifiers(param: any, names: string[]): void {
  switch (param.type) {
    case 'Identifier':
      names.push(param.name)
      break
    case 'MemberExpression': {
      let obj = param
      while (obj.type === 'MemberExpression') obj = obj.object
      names.push(obj.name)
      break
    }
    case 'ObjectPattern':
      for (const prop of param.properties) {
        ownExtractIdentifiers(
          prop.type === 'RestElement' ? prop : prop.value,
          names,
        )
      }
      break
    case 'ArrayPattern':
      for (const el of param.elements) {
        if (el) ownExtractIdentifiers(el, names)
      }
      break
    case 'RestElement':
      ownExtractIdentifiers(param.argument, names)
      break
    case 'AssignmentPattern':
      ownExtractIdentifiers(param.left, names)
      break
  }
}
