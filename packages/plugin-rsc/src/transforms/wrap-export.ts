import { tinyassert } from '@hiogawa/utils'
import MagicString from 'magic-string'
import type { ESTree } from 'vite'
import {
  scanModuleExports,
  type ModuleExportEntry,
  type ModuleExportMeta,
} from './module-export-scan'
import { validateNonAsyncFunction } from './utils'

export type TransformWrapExportFilter = (
  name: string,
  meta: ModuleExportMeta,
) => boolean

export type TransformWrapExportOptions = {
  runtime: (value: string, name: string, meta: ModuleExportMeta) => string
  ignoreExportAllDeclaration?: boolean
  rejectNonAsyncFunction?: boolean
  filter?: TransformWrapExportFilter
}

export function transformWrapExport(
  input: string,
  viteAst: ESTree.Program,
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
    exports: ModuleExportEntry[],
  ) {
    const filteredExports = exports.map((item) => {
      return {
        ...item,
        shouldWrap: filter(item.exportName, item.meta),
      }
    })
    exportNames.push(
      ...filteredExports
        .filter((item) => item.shouldWrap)
        .map((item) => item.exportName),
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
          `${e.localName} = /* #__PURE__ */ ${options.runtime(
            e.localName,
            e.exportName,
            e.meta,
          )};\n`,
        `export { ${e.localName} };\n`,
      ])
      .flat()
      .filter(Boolean)
      .join('')
    output.update(start, end, newCode)
    output.move(start, end, input.length)
  }

  function wrapExport(
    name: string,
    exportName: string,
    meta: ModuleExportMeta = {},
  ) {
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

  for (const group of scanModuleExports(viteAst)) {
    if (group.type === 'declaration') {
      const [entry] = group.exports
      if (filter(entry.exportName, entry.meta)) {
        validateNonAsyncFunction(options, group.declaration)
      }
      wrapSimple(group.node.start, group.declaration.start, group.exports)
    } else if (group.type === 'variable-declaration') {
      const exports: ModuleExportEntry[] = []
      let shouldWrap = false
      for (const declarator of group.declarators) {
        exports.push(...declarator.exports)
        const shouldWrapDeclarator = declarator.exports.some(
          ({ exportName, meta }) => filter(exportName, meta),
        )
        if (shouldWrapDeclarator) {
          shouldWrap = true
        }
        if (declarator.node.init && shouldWrapDeclarator) {
          validateNonAsyncFunction(options, declarator.node.init)
        }
      }
      if (!shouldWrap) continue

      if (group.declaration.kind === 'const') {
        output.update(
          group.declaration.start,
          group.declaration.start + 5,
          'let',
        )
      }
      wrapSimple(group.node.start, group.declaration.start, exports)
    } else if (group.type === 'specifiers') {
      if (group.node.source) {
        output.remove(group.node.start, group.node.end)
        for (const entry of group.exports) {
          tinyassert(entry.node.local.type === 'Identifier')
          if (entry.node.exported.type !== 'Identifier') {
            throw Object.assign(
              new Error('unsupported string literal export name'),
              { pos: entry.node.exported.start },
            )
          }
          toAppend.push(
            `import { ${entry.localName} as $$import_${entry.localName} } from ${group.node.source.raw}`,
          )
          wrapExport(
            `$$import_${entry.localName}`,
            entry.exportName,
            entry.meta,
          )
        }
      } else {
        output.remove(group.node.start, group.node.end)
        for (const entry of group.exports) {
          tinyassert(entry.node.local.type === 'Identifier')
          if (entry.node.exported.type !== 'Identifier') {
            throw Object.assign(
              new Error('unsupported string literal export name'),
              { pos: entry.node.exported.start },
            )
          }
          wrapExport(entry.localName, entry.exportName, entry.meta)
        }
      }
    } else if (group.type === 'export-all') {
      // Vue SFC uses ExportAllDeclaration to re-export its setup script, so
      // consumers can opt out of rejecting this form.
      // https://github.com/vitejs/vite-plugin-vue/blob/30a97c1ddbdfb0e23b7dc14a1d2fb609668b9987/packages/plugin-vue/src/main.ts#L372
      if (!options.ignoreExportAllDeclaration) {
        throw Object.assign(new Error('unsupported ExportAllDeclaration'), {
          pos: group.node.start,
        })
      }
    } else if (group.type === 'default') {
      const localName = group.localName ?? '$$default'
      if (group.kind === 'named-declaration') {
        // preserve name scope for `function foo() {}` and `class Foo {}`
        // e.g.
        //   export default foo() {}
        //   ^^^^^^^^^^^^^^
        //.  ⬇️ (remove `export default`)
        //   function foo() {}
        output.remove(group.node.start, group.node.declaration.start)
      } else {
        // otherwise we can introduce new variable
        // e.g.
        //   export default foo
        //   ^^^^^^^^^^^^^^
        //.  ⬇️ (replace `export default`)
        //   const $$default = foo
        //   ^^^^^^^^^^^^^^^^^
        output.update(
          group.node.start,
          group.node.declaration.start,
          'const $$default = ',
        )
      }
      const meta = group.meta
      if (filter('default', meta)) {
        validateNonAsyncFunction(options, group.node.declaration)
      }
      wrapExport(localName, 'default', meta)
    }
  }

  if (toAppend.length > 0) {
    output.append(['', ...toAppend, ''].join(';\n'))
  }

  return { exportNames, output }
}
