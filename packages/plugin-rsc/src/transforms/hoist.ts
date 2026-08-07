import { tinyassert } from '@hiogawa/utils'
import type {
  ArrowFunctionExpression,
  FunctionDeclaration,
  FunctionExpression,
  Program,
  Literal,
  Node,
  MemberExpression,
  Identifier,
  MethodDefinition,
  Property,
} from 'estree'
import { walk } from 'estree-walker'
import MagicString from 'magic-string'
import type { ESTree } from 'vite'
import { buildScopeTree, type ScopeTree } from './scope'
import { isDirective } from './utils'

export type TransformHoistInlineDirectiveOptions = {
  runtime: (
    value: string,
    name: string,
    meta: TransformHoistInlineDirectiveMeta,
  ) => string
  directive: string | RegExp
  rejectNonAsyncFunction?: boolean
  encode?: (value: string) => string
  decode?: (value: string) => string
  /** Keep generated hoisted declarations module-local instead of exporting them. */
  noExport?: boolean
  /**
   * Evaluate the runtime expression once during module initialization.
   * The expression can reference imports and the hoisted implementation, but
   * must not depend on other module-local initialization.
   */
  hoistRuntime?: boolean
}

export type TransformHoistInlineDirectiveMeta = {
  /** Match result for the source function directive. */
  directiveMatch: RegExpMatchArray
  /** Original source function before closure captures are added as parameters. */
  valueNode: ArrowFunctionExpression | FunctionDeclaration | FunctionExpression
}

export type TransformHoistInlineDirectiveResult = {
  output: MagicString
  names: string[]
}

/**
 * Turns an inline directive function into a module-level registered function.
 * Conceptually:
 *
 * ```js
 * function Component() {
 *   const x = 1
 *   async function action(y) {
 *     "use server"
 *     return x + y
 *   }
 * }
 * ```
 *
 * becomes:
 *
 * ```js
 * function Component() {
 *   const x = 1
 *   const action = __RUNTIME__($$hoist_0_action).bind(null, x)
 * }
 * export async function $$hoist_0_action(x, y) {
 *   "use server"
 *   return x + y
 * }
 * ```
 *
 * The generated export is `$$hoist_0_action`, so `names` contains
 * `['$$hoist_0_action']` for this example.
 *
 * Here, `__RUNTIME__(...)` represents the registration expression returned by the
 * `runtime` callback. When `encode` and `decode` are provided, the closure
 * captures instead travel as one encoded bound argument:
 *
 * ```js
 * function Component() {
 *   const x = 1
 *   const action = __RUNTIME__($$hoist_0_action).bind(
 *     null,
 *     __ENCODE__([x]),
 *   )
 * }
 *
 * export async function $$hoist_0_action($$hoist_encoded, y) {
 *   const [x] = __DECODE__($$hoist_encoded)
 *   "use server"
 *   return x + y
 * }
 * ```
 *
 * In this second sketch, `__ENCODE__(...)` and `__DECODE__(...)` likewise
 * represent the expressions returned by those code-generation callbacks.
 *
 * With `hoistRuntime`, the runtime result becomes the module-level binding and
 * the moved function becomes its private implementation:
 *
 * ```js
 * function Component() {
 *   const x = 1
 *   const action = $$hoist_0_action.bind(null, x)
 * }
 * export const $$hoist_0_action = __RUNTIME__($$hoist_0_action$$impl)
 * async function $$hoist_0_action$$impl(x, y) {
 *   "use server"
 *   return x + y
 * }
 * ```
 *
 * `noExport` independently keeps `$$hoist_0_action` module-local when an
 * integration needs module-scope runtime initialization without an export.
 */
export function transformHoistInlineDirective(
  input: string,
  viteAst: ESTree.Program,
  {
    runtime,
    rejectNonAsyncFunction,
    ...options
  }: TransformHoistInlineDirectiveOptions,
): TransformHoistInlineDirectiveResult {
  const ast = viteAst as unknown as Program
  // MagicString needs an existing boundary at the move destination. The newline
  // also keeps the first appended declaration separate from the original source.
  if (!input.endsWith('\n')) {
    input += '\n'
  }
  const output = new MagicString(input)
  const directive =
    typeof options.directive === 'string'
      ? exactRegex(options.directive)
      : options.directive

  // Build the complete scope tree once so each hoisted function can distinguish
  // closure captures from module bindings and globals, which remain in scope.
  const scopeTree = buildScopeTree(ast)
  const names: string[] = []
  const runtimeHoists: string[] = []

  walk(ast, {
    enter(node, parent) {
      if (
        (node.type === 'FunctionExpression' ||
          node.type === 'FunctionDeclaration' ||
          node.type === 'ArrowFunctionExpression') &&
        node.body.type === 'BlockStatement'
      ) {
        // Only transform functions whose block contains the requested
        // directive. Other function shapes cannot contain directive prologues.
        const match = matchDirective(node.body.body, directive)?.match
        if (!match) return

        const methodInfo = getMethodInfo(node, parent, match[0])
        if (!node.async && rejectNonAsyncFunction) {
          throw Object.assign(
            new Error(`"${directive}" doesn't allow non async function`),
            {
              pos: node.start,
            },
          )
        }

        // Capture the source-level name so the hoisted function can preserve it
        // with Object.defineProperty below. Anonymous functions get a stable
        // fallback for registration and diagnostics.
        const declName = node.type === 'FunctionDeclaration' && node.id.name
        const originalName =
          declName ||
          methodInfo?.name ||
          (parent?.type === 'VariableDeclarator' &&
            parent.id.type === 'Identifier' &&
            parent.id.name) ||
          'anonymous_server_function'

        // Convert closure captures into leading parameters of the hoisted
        // function. At the original call site, registration below binds the
        // corresponding values in the same order.
        const bindVars = getBindVars(node, scopeTree)
        let newParams = [
          ...bindVars.map((b) => b.root),
          ...node.params.map((n) => input.slice(n.start, n.end)),
        ].join(', ')
        if (bindVars.length > 0 && options.decode) {
          // Encoded captures travel as one bound argument, then are restored to
          // the individual parameter names before the original body executes.
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

        // Rewrite and hoist the original function range into its module-level form.
        // These edits must happen before `.move()` (hoist) so they travel with the range.
        const newName =
          `$$hoist_${names.length}` + (originalName ? `_${originalName}` : '')
        names.push(newName)
        // Hoisted runtimes need two module bindings: a private function for the
        // original body and a canonical binding for the runtime result. The
        // default path keeps the original single generated function binding.
        const implementationName = options.hoistRuntime
          ? `${newName}$$impl`
          : newName
        output.update(
          node.start,
          node.body.start,
          `\n;${options.noExport || options.hoistRuntime ? '' : 'export '}${
            node.async ? 'async ' : ''
          }function${node.generator ? '*' : ''} ${implementationName}(${newParams}) `,
        )
        const runtimeCode = `/* #__PURE__ */ ${runtime(
          implementationName,
          newName,
          { directiveMatch: match, valueNode: node },
        )}`
        if (options.hoistRuntime) {
          runtimeHoists.push(
            `${options.noExport ? '' : 'export '}const ${newName} = ${runtimeCode};\n`,
          )
        }
        output.appendLeft(
          node.end,
          `;\n/* #__PURE__ */ Object.defineProperty(${implementationName}, "name", { value: ${JSON.stringify(
            originalName,
          )} });\n`,
        )
        output.move(node.start, node.end, input.length)

        // Replace the original function with either the hoisted runtime result
        // or the runtime expression for its hoisted declaration. Bind closure
        // captures to the prepended parameters (or one encoded parameter).
        // example:
        //   const someFn = () => { .... }
        //     ⬇️
        //   const someFn = __WRAP__($$hoist_0_someFn).bind(null, x, y)
        //   const someFn = $$hoist_0_someFn.bind(null, x, y)           // with hoistRuntime
        let newCode = options.hoistRuntime ? newName : runtimeCode
        if (bindVars.length > 0) {
          const bindArgs = options.encode
            ? options.encode('[' + bindVars.map((b) => b.expr).join(', ') + ']')
            : bindVars.map((b) => b.expr).join(', ')
          newCode = `${newCode}.bind(null, ${bindArgs})`
        }
        if (methodInfo) {
          // example:
          //   { async someFn() { ... } }
          //     ⬇️
          //   { ["someFn"]: __WRAP__($$hoist_0_someFn) }
          // example:
          //   class C { static async someFn() { ... } }
          //     ⬇️
          //   class C { static ["someFn"] = __WRAP__($$hoist_0_someFn); }

          const isStatic = methodInfo.node.type === 'MethodDefinition'
          const key = input.slice(
            methodInfo.node.key.start,
            methodInfo.node.key.end,
          )
          // always quote identifier method name for edge cases like `constructor` or `__proto__`
          const propertyKey =
            !methodInfo.node.computed &&
            methodInfo.node.key.type === 'Identifier'
              ? `["${key}"]`
              : `[${key}]`
          output.update(
            methodInfo.node.start,
            node.start,
            `${isStatic ? 'static ' : ''}${propertyKey}${isStatic ? ' = ' : ': '}`,
          )
          if (isStatic) {
            newCode += ';'
          }
        } else if (declName) {
          // A function declaration becomes a const declaration. For a default
          // export, retain the export as a separate statement after that const.
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

  if (runtimeHoists.length > 0) {
    // Define hoisted runtime wrappers after leading directives.
    output.prependLeft(getRuntimeHoistPosition(ast), runtimeHoists.join(''))
  }

  // Expose the canonical generated names. They identify the moved functions by
  // default or the runtime result bindings under hoistRuntime. Both are exports
  // unless noExport is set, so callers can also track them as runtime references.
  return {
    output,
    names,
  }
}

type MethodInfo = {
  /** The object property or class method containing the function expression. */
  node: Property | MethodDefinition
  /** The name of a non-computed identifier method. */
  name?: string
}

function getMethodInfo(
  node: Node,
  parent: Node | null,
  directive: string,
): MethodInfo | undefined {
  if (node.type !== 'FunctionExpression') return

  let method: Property | MethodDefinition
  if (
    parent?.type === 'Property' &&
    parent.value === node &&
    (parent.method || parent.kind !== 'init')
  ) {
    method = parent
  } else if (parent?.type === 'MethodDefinition') {
    method = parent
  } else {
    return
  }

  // Next.js error fixture 25 rejects directive-bearing instance methods:
  // https://github.com/vercel/next.js/tree/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/errors/server-actions/server-graph/25
  if (method.type === 'MethodDefinition' && !method.static) {
    throw Object.assign(
      new Error(
        `It is not allowed to define inline ${JSON.stringify(directive)} class instance methods.`,
      ),
      { pos: method.start },
    )
  }
  // No Next.js error fixture covers this. Private methods cannot be replaced
  // with public callable fields.
  if (
    method.type === 'MethodDefinition' &&
    method.key.type === 'PrivateIdentifier'
  ) {
    throw Object.assign(
      new Error(
        `It is not allowed to define inline ${JSON.stringify(directive)} private class methods.`,
      ),
      { pos: method.start },
    )
  }
  // No Next.js error fixture covers this. Accessors cannot be replaced with
  // value properties without changing their contract.
  if (
    (method.type === 'Property' && method.kind !== 'init') ||
    (method.type === 'MethodDefinition' && method.kind !== 'method')
  ) {
    throw Object.assign(
      new Error(
        `It is not allowed to define inline ${JSON.stringify(directive)} getters or setters.`,
      ),
      { pos: method.start },
    )
  }

  const keyName =
    !method.computed && method.key.type === 'Identifier'
      ? method.key.name
      : undefined
  return {
    node: method,
    name: keyName,
  }
}

function getRuntimeHoistPosition(ast: Program): number {
  // Preserve leading directives so directive-based transforms can
  // still compose just in case.
  for (const statement of ast.body) {
    if (!isDirective(statement)) {
      return statement.start
    }
  }
  return 0
}

const exactRegex = (s: string): RegExp =>
  new RegExp('^' + s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$')

function matchDirective(
  body: Program['body'],
  directive: RegExp,
): { match: RegExpMatchArray; node: Literal } | undefined {
  for (const stmt of body) {
    if (!isDirective(stmt)) {
      return
    }
    const match = stmt.directive.match(directive)
    if (match) {
      return { match, node: stmt.expression }
    }
  }
}

export function findDirectives(
  viteAst: ESTree.Program,
  directive: string,
): Literal[] {
  const ast = viteAst as unknown as Program
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
    const entries: string[] = []
    for (const [key, child] of node) {
      // ECMAScript object literals treat `__proto__: value` specially: when the
      // property name is non-computed and equals "__proto__", evaluation performs
      // [[SetPrototypeOf]] instead of creating a normal own data property. Emit a
      // computed key here so synthesized partial objects preserve the original
      // member-path shape rather than mutating the new object's prototype.
      // Spec: https://tc39.es/ecma262/#sec-runtime-semantics-propertydefinitionevaluation
      const safeKey = key === '__proto__' ? `["__proto__"]` : key
      entries.push(`${safeKey}: ${serialize(child, [...segments, key])}`)
    }
    return `{ ${entries.join(', ')} }`
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
