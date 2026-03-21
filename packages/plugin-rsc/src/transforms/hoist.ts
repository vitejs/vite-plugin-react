import { tinyassert } from '@hiogawa/utils'
import type { Program, Literal, Expression, Super } from 'estree'
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
          .flatMap((ref) => {
            // extract the full expression used for a variable so that we can bind the whole
            // expression accessor instead of the bare variable, which may not be serializable
            // e.g. `config.cookiePrefix` instead of `config`, which may have non-serializable
            // properties like a `config.get` function.
            const exprs = new Set<string>()
            let isBareVarUsed = false

            walk(node.body, {
              enter(inner, innerParent) {
                const isLHSOfMemberExpr =
                  innerParent?.type === 'MemberExpression' &&
                  innerParent.object === inner &&
                  !innerParent.computed

                if (inner.type === 'Identifier' && inner.name === ref) {
                  if (isLHSOfMemberExpr) return
                  isBareVarUsed = true
                } else if (
                  inner.type === 'MemberExpression' &&
                  !inner.computed &&
                  !isLHSOfMemberExpr
                ) {
                  // walk down the object chain until we find the leaf identifier and check if it's the ref
                  let root: Expression | Super = inner
                  while (root.type === 'MemberExpression') root = root.object

                  if (root.type === 'Identifier' && root.name === ref) {
                    exprs.add(input.slice(inner.start, inner.end))
                  }
                }
              },
            })

            if (isBareVarUsed || exprs.size === 0)
              return [{ param: ref, arg: ref }]

            return [...exprs.values()].map((expr, idx) => {
              const param = `$$bind_${idx}_${expr.replace(/\./g, '_')}`
              walk(node.body, {
                enter(inner) {
                  if (input.slice(inner.start, inner.end) === expr) {
                    output.update(inner.start, inner.end, param)
                  }
                },
              })
              return { param, arg: expr }
            })
          })

        let newParams = [
          ...bindVars.map((b) => b.param),
          ...node.params.map((n) => input.slice(n.start, n.end)),
        ].join(', ')
        if (bindVars.length > 0 && options.decode) {
          newParams = [
            '$$hoist_encoded',
            ...node.params.map((n) => input.slice(n.start, n.end)),
          ].join(', ')
          output.appendLeft(
            node.body.body[0]!.start,
            `const [${bindVars.map((b) => b.param).join(',')}] = ${options.decode(
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
            ? options.encode('[' + bindVars.map((b) => b.arg).join(', ') + ']')
            : bindVars.map((b) => b.arg).join(', ')
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
