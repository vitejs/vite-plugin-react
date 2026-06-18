import { tinyassert } from '@hiogawa/utils'
import type { Program } from 'estree'
import MagicString from 'magic-string'
import { extractNames, validateNonAsyncFunction } from './utils'

export type FunctionParameters = {
  count: number
  hasRest: boolean
}

export type ExportMeta = {
  declName?: string
  isFunction?: boolean
  defaultExportIdentifierName?: string
  parameters?: FunctionParameters
}

export type TransformWrapExportFilter = (
  name: string,
  meta: ExportMeta,
) => boolean

export type TransformWrapExportOptions = {
  runtime: (value: string, name: string, meta: ExportMeta) => string
  ignoreExportAllDeclaration?: boolean
  rejectNonAsyncFunction?: boolean
  filter?: TransformWrapExportFilter
}

export function transformWrapExport(
  input: string,
  ast: Program,
  options: TransformWrapExportOptions,
): {
  exportNames: string[]
  output: MagicString
} {
  const output = new MagicString(input)
  const exportNames: string[] = []
  const toAppend: string[] = []
  const filter = options.filter ?? (() => true)
  const localFunctionParameters = new Map<string, FunctionParameters>()

  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration' && node.id) {
      localFunctionParameters.set(node.id.name, getFunctionParameters(node))
    } else if (node.type === 'VariableDeclaration') {
      for (const declaration of node.declarations) {
        if (
          declaration.id.type === 'Identifier' &&
          (declaration.init?.type === 'ArrowFunctionExpression' ||
            declaration.init?.type === 'FunctionExpression')
        ) {
          localFunctionParameters.set(
            declaration.id.name,
            getFunctionParameters(declaration.init),
          )
        }
      }
    }
  }

  function wrapSimple(
    start: number,
    end: number,
    exports: { name: string; meta: ExportMeta }[],
  ) {
    exportNames.push(...exports.map((e) => e.name))
    // update code and move to preserve `registerServerReference` position
    // e.g.
    // input
    //   export async function f() {}
    //   ^^^^^^
    // output
    //   async function f() {}
    //   f = registerServerReference(f, ...)   << maps to original "export" token
    //   export { f }                          <<
    const newCode = exports
      .map((e) => [
        filter(e.name, e.meta) &&
          `${e.name} = /* #__PURE__ */ ${options.runtime(
            e.name,
            e.name,
            e.meta,
          )};\n`,
        `export { ${e.name} };\n`,
      ])
      .flat()
      .filter(Boolean)
      .join('')
    output.update(start, end, newCode)
    output.move(start, end, input.length)
  }

  function wrapExport(name: string, exportName: string, meta: ExportMeta = {}) {
    exportNames.push(exportName)
    if (!filter(exportName, meta)) {
      toAppend.push(`export { ${name} as ${exportName} }`)
      return
    }

    toAppend.push(
      `const $$wrap_${name} = /* #__PURE__ */ ${options.runtime(
        name,
        exportName,
        meta,
      )}`,
      `export { $$wrap_${name} as ${exportName} }`,
    )
  }

  for (const node of ast.body) {
    // named exports
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (
          node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration'
        ) {
          /**
           * export function foo() {}
           */
          validateNonAsyncFunction(options, node.declaration)
          const name = node.declaration.id.name
          wrapSimple(node.start, node.declaration.start, [
            {
              name,
              meta: {
                isFunction: node.declaration.type === 'FunctionDeclaration',
                declName: name,
                parameters:
                  node.declaration.type === 'FunctionDeclaration'
                    ? getFunctionParameters(node.declaration)
                    : undefined,
              },
            },
          ])
        } else if (node.declaration.type === 'VariableDeclaration') {
          /**
           * export const foo = 1, bar = 2
           */
          for (const decl of node.declaration.declarations) {
            if (decl.init) {
              validateNonAsyncFunction(options, decl.init)
            }
          }
          if (node.declaration.kind === 'const') {
            output.update(
              node.declaration.start,
              node.declaration.start + 5,
              'let',
            )
          }
          const names = node.declaration.declarations.flatMap((decl) =>
            extractNames(decl.id),
          )
          // treat only simple single decl as function
          let isFunction = false
          let parameters: FunctionParameters | undefined
          if (node.declaration.declarations.length === 1) {
            const decl = node.declaration.declarations[0]!
            isFunction =
              decl.id.type === 'Identifier' &&
              (decl.init?.type === 'ArrowFunctionExpression' ||
                decl.init?.type === 'FunctionExpression')
            if (isFunction) {
              parameters = getFunctionParameters(
                decl.init as
                  | import('estree').ArrowFunctionExpression
                  | import('estree').FunctionExpression,
              )
            }
          }
          wrapSimple(
            node.start,
            node.declaration.start,
            names.map((name) => ({
              name,
              meta: { isFunction, declName: name, parameters },
            })),
          )
        } else {
          node.declaration satisfies never
        }
      } else {
        if (node.source) {
          /**
           * export { foo, bar as car } from './foo'
           */
          output.remove(node.start, node.end)
          for (const spec of node.specifiers) {
            tinyassert(spec.local.type === 'Identifier')
            if (spec.exported.type !== 'Identifier') {
              throw Object.assign(
                new Error('unsupported string literal export name'),
                { pos: spec.exported.start },
              )
            }
            const name = spec.local.name
            toAppend.push(
              `import { ${name} as $$import_${name} } from ${node.source.raw}`,
            )
            wrapExport(`$$import_${name}`, spec.exported.name)
          }
        } else {
          /**
           * export { foo, bar as car }
           */
          output.remove(node.start, node.end)
          for (const spec of node.specifiers) {
            tinyassert(spec.local.type === 'Identifier')
            if (spec.exported.type !== 'Identifier') {
              throw Object.assign(
                new Error('unsupported string literal export name'),
                { pos: spec.exported.start },
              )
            }
            wrapExport(spec.local.name, spec.exported.name, {
              isFunction: localFunctionParameters.has(spec.local.name)
                ? true
                : undefined,
              parameters: localFunctionParameters.get(spec.local.name),
            })
          }
        }
      }
    }

    /**
     * export * as ns from './foo'
     * export * from './foo'
     */
    // vue sfc uses ExportAllDeclaration to re-export setup script.
    // for now we just give an option to not throw for this case.
    // https://github.com/vitejs/vite-plugin-vue/blob/30a97c1ddbdfb0e23b7dc14a1d2fb609668b9987/packages/plugin-vue/src/main.ts#L372
    if (node.type === 'ExportAllDeclaration') {
      if (!options.ignoreExportAllDeclaration) {
        throw Object.assign(new Error('unsupported ExportAllDeclaration'), {
          pos: node.start,
        })
      }
    }

    /**
     * export default function foo() {}
     * export default class Foo {}
     * export default () => {}
     */
    if (node.type === 'ExportDefaultDeclaration') {
      validateNonAsyncFunction(options, node.declaration)
      const parameters =
        node.declaration.type === 'FunctionDeclaration' ||
        node.declaration.type === 'FunctionExpression' ||
        node.declaration.type === 'ArrowFunctionExpression'
          ? getFunctionParameters(node.declaration)
          : node.declaration.type === 'Identifier'
            ? localFunctionParameters.get(node.declaration.name)
            : undefined
      let localName: string
      let isFunction = false
      let declName: string | undefined
      let defaultExportIdentifierName: string | undefined
      if (
        (node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration') &&
        node.declaration.id
      ) {
        // preserve name scope for `function foo() {}` and `class Foo {}`
        localName = node.declaration.id.name
        output.remove(node.start, node.declaration.start)
        isFunction = node.declaration.type === 'FunctionDeclaration'
        declName = node.declaration.id.name
      } else {
        // otherwise we can introduce new variable
        localName = '$$default'
        output.update(node.start, node.declaration.start, 'const $$default = ')
        if (node.declaration.type === 'Identifier') {
          defaultExportIdentifierName = node.declaration.name
        }
      }
      wrapExport(localName, 'default', {
        isFunction,
        declName,
        defaultExportIdentifierName,
        parameters,
      })
    }
  }

  if (toAppend.length > 0) {
    output.append(['', ...toAppend, ''].join(';\n'))
  }

  return { exportNames, output }
}

function getFunctionParameters(node: {
  params: import('estree').Pattern[]
}): FunctionParameters {
  return {
    count: node.params.length,
    hasRest: node.params.some((parameter) => parameter.type === 'RestElement'),
  }
}
