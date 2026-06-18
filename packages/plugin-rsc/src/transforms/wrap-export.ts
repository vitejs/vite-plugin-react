import { tinyassert } from '@hiogawa/utils'
import type { Program } from 'estree'
import MagicString from 'magic-string'
import { extractNames, validateNonAsyncFunction } from './utils'

type ExportMeta = {
  declName?: string
  isFunction?: boolean
  defaultExportIdentifierName?: string
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

  function wrapSimple(
    start: number,
    end: number,
    exports: { name: string; meta: ExportMeta }[],
  ) {
    const filteredExports = exports.map((item) => ({
      ...item,
      shouldWrap: filter(item.name, item.meta),
    }))
    exportNames.push(
      ...filteredExports
        .filter((item) => item.shouldWrap)
        .map((item) => item.name),
    )
    // update code and move to preserve `registerServerReference` position
    // e.g.
    // input
    //   export async function f() {}
    //   ^^^^^^
    // output
    //   async function f() {}
    //   f = registerServerReference(f, ...)   << maps to original "export" token
    //   export { f }                          <<
    const newCode = filteredExports
      .map((e) => [
        e.shouldWrap &&
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
    if (!filter(exportName, meta)) {
      toAppend.push(`export { ${name} as ${exportName} }`)
      return
    }
    exportNames.push(exportName)

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
          const name = node.declaration.id.name
          const meta = { isFunction: true, declName: name }
          if (filter(name, meta)) {
            validateNonAsyncFunction(options, node.declaration)
          }
          wrapSimple(node.start, node.declaration.start, [{ name, meta }])
        } else if (node.declaration.type === 'VariableDeclaration') {
          /**
           * export const foo = 1, bar = 2
           */
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
          let isFunction: boolean | undefined
          if (node.declaration.declarations.length === 1) {
            const decl = node.declaration.declarations[0]!
            if (decl.id.type === 'Identifier') {
              if (
                decl.init?.type === 'ArrowFunctionExpression' ||
                decl.init?.type === 'FunctionExpression'
              ) {
                isFunction = true
              } else if (
                decl.init?.type === 'Literal' ||
                decl.init?.type === 'ObjectExpression' ||
                decl.init?.type === 'ArrayExpression' ||
                decl.init?.type === 'ClassExpression'
              ) {
                isFunction = false
              }
            }
          }
          for (const decl of node.declaration.declarations) {
            if (
              decl.init &&
              extractNames(decl.id).some((name) =>
                filter(name, { isFunction, declName: name }),
              )
            ) {
              validateNonAsyncFunction(options, decl.init)
            }
          }
          wrapSimple(
            node.start,
            node.declaration.start,
            names.map((name) => ({
              name,
              meta: { isFunction, declName: name },
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
            wrapExport(spec.local.name, spec.exported.name)
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
      let localName: string
      let isFunction: boolean | undefined
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
        } else if (
          node.declaration.type === 'ArrowFunctionExpression' ||
          node.declaration.type === 'FunctionExpression'
        ) {
          isFunction = true
        } else if (
          node.declaration.type === 'Literal' ||
          node.declaration.type === 'ObjectExpression' ||
          node.declaration.type === 'ArrayExpression' ||
          node.declaration.type === 'ClassExpression'
        ) {
          isFunction = false
        }
      }
      const defaultMeta = {
        isFunction,
        declName,
        defaultExportIdentifierName,
      }
      if (filter('default', defaultMeta)) {
        validateNonAsyncFunction(options, node.declaration)
      }
      wrapExport(localName, 'default', defaultMeta)
    }
  }

  if (toAppend.length > 0) {
    output.append(['', ...toAppend, ''].join(';\n'))
  }

  return { exportNames, output }
}
