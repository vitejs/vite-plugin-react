import { tinyassert } from '@hiogawa/utils'
import type { Program, Literal } from 'estree'
import { walk } from 'estree-walker'
import MagicString from 'magic-string'
import { analyze, extract_names } from 'periscopic'

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
        const localDecls = collectLocallyDeclaredNames(node.body)
        const bindVars = [...scope.references].filter((ref) => {
          // declared function itself is included as reference
          if (ref === declName) {
            return false
          }

          // periscopic misclassifies block-scoped declarations inside a
          // "use server" function body as closure references when the same
          // name exists in an enclosing scope. Exclude any name that is
          // actually declared within this function body.
          if (localDecls.has(ref)) {
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

/**
 * Collect all names declared within a function body, without crossing into
 * nested function boundaries (which have their own scope).
 *
 * This guards against a periscopic limitation where block-scoped declarations
 * (`const`/`let`) inside a `BlockStatement` are misclassified as references
 * to outer-scope bindings.  Any name returned here must NOT be in `bindVars`.
 */
function collectLocallyDeclaredNames(
  body: Program['body'][number],
): Set<string> {
  const names = new Set<string>()

  walk(body, {
    enter(node) {
      switch (node.type) {
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ClassDeclaration':
          if (node.id) names.add(node.id.name)
          return this.skip()
        case 'ArrowFunctionExpression':
          return this.skip()
        case 'VariableDeclaration':
          for (const decl of node.declarations) {
            for (const name of extract_names(decl.id)) {
              names.add(name)
            }
          }
      }
    },
  })

  return names
}
