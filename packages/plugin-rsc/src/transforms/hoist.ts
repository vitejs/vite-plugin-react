import { tinyassert } from '@hiogawa/utils'
import type {
  Program,
  Literal,
  Node,
  MemberExpression,
  Identifier,
} from 'estree'
import { walk } from 'estree-walker'
import MagicString from 'magic-string'
import { buildScopeTree, type ScopeTree } from './scope'

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
          ...bindVars.map((b) => b.root),
          ...node.params.map((n) => input.slice(n.start, n.end)),
        ].join(', ')
        if (bindVars.length > 0 && options.decode) {
          newParams = [
            '$$hoist_encoded',
            ...node.params.map((n) => input.slice(n.start, n.end)),
          ].join(', ')
          output.appendLeft(
            node.body.body[0]!.start,
            `const [${bindVars.map((b) => b.root).join(',')}] = ${options.decode(
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
            ? options.encode('[' + bindVars.map((b) => b.expr).join(', ') + ']')
            : bindVars.map((b) => b.expr).join(', ')
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

type BindVar = {
  root: string // hoisted function param name (root identifier name)
  expr: string // bind expression at the call site (root name or synthesized partial object)
}

// e.g.
// x.y.z -> { key: "y.z", segments: ["y", "z"] }
type BindPath = {
  // TODO: This currently models only plain non-computed member chains like
  // `x.y.z`. Supporting optional chaining or computed access would require
  // richer per-segment metadata and corresponding codegen changes.
  key: string
  segments: string[]
}

function getBindVars(fn: Node, scopeTree: ScopeTree): BindVar[] {
  const fnScope = scopeTree.nodeScope.get(fn)!
  const ancestorScopes = fnScope.getAncestorScopes()
  const references = scopeTree.scopeToReferences.get(fnScope) ?? []

  // bind references that are declared in an ancestor scope, but not module scope nor global
  const bindReferences = references.filter((id) => {
    const scope = scopeTree.referenceToDeclaredScope.get(id)
    return scope && scope !== scopeTree.moduleScope && ancestorScopes.has(scope)
  })

  // Group by referenced identifier name (root).
  // For each root, track whether the root itself is used
  // bare (direct identifier access) or only via member paths.
  type IdentifierAccess =
    | { kind: 'bare' }
    | { kind: 'paths'; paths: BindPath[] }

  const accessMap: Record<string, IdentifierAccess> = {}

  for (const id of bindReferences) {
    const name = id.name
    const node = scopeTree.referenceToNode.get(id)!
    if (node.type === 'Identifier') {
      accessMap[name] = { kind: 'bare' }
      continue
    }

    accessMap[name] ??= { kind: 'paths', paths: [] }
    const entry = accessMap[name]
    if (entry.kind === 'paths') {
      const path = memberExpressionToPath(node)
      if (!entry.paths.some((existing) => existing.key === path.key)) {
        entry.paths.push(path)
      }
    }
  }

  const result: BindVar[] = []
  for (const [root, entry] of Object.entries(accessMap)) {
    if (entry.kind === 'bare') {
      result.push({ root, expr: root })
      continue
    }
    result.push({
      root,
      expr: synthesizePartialObject(root, entry.paths),
    })
  }

  return result
}

function memberExpressionToPath(node: MemberExpression): BindPath {
  const segments: string[] = []
  let current: Identifier | MemberExpression = node
  while (current.type === 'MemberExpression') {
    tinyassert(current.property.type === 'Identifier')
    segments.unshift(current.property.name)
    tinyassert(
      current.object.type === 'Identifier' ||
        current.object.type === 'MemberExpression',
    )
    current = current.object
  }
  return {
    key: segments.join('.'),
    segments,
  }
}

// Build a nested object literal string from member paths, deduping prefixes
// during trie construction.
// e.g.
// [a, x.y, x.y.z, x.w, s.t] =>
// { a: root.a, x: { y: root.x.y, w: root.x.w }, s: { t: root.s.t } }
function synthesizePartialObject(root: string, bindPaths: BindPath[]): string {
  type TrieNode = Map<string, TrieNode>
  const trie = new Map<string, TrieNode>()

  const paths = dedupeByPrefix(bindPaths.map((p) => p.segments))
  for (const path of paths) {
    let node = trie
    for (let i = 0; i < path.length; i++) {
      const segment = path[i]!
      let child = node.get(segment)
      if (!child) {
        child = new Map()
        node.set(segment, child)
      }
      node = child
    }
  }

  function serialize(node: TrieNode, segments: string[]): string {
    if (node.size === 0) {
      return root + segments.map((segment) => `.${segment}`).join('')
    }
    const entries = [...node.entries()]
      .map(([k, child]) => `${k}: ${serialize(child, [...segments, k])}`)
      .join(', ')
    return `{ ${entries} }`
  }

  return serialize(trie, [])
}

// e.g.
// [x.y, x.y.z, x.w] -> [x.y, x.w]
// [x.y.z, x.y.z.w] -> [x.y.z]
function dedupeByPrefix(paths: string[][]): string[][] {
  const sorted = [...paths].sort((a, b) => a.length - b.length)
  const result: string[][] = []
  for (const path of sorted) {
    const isPrefix = result.some((existingPath) =>
      existingPath.every((segment, i) => segment === path[i]),
    )
    if (!isPrefix) {
      result.push(path)
    }
  }
  return result
}
