import { tinyassert } from '@hiogawa/utils'
import type {
  ExportDefaultDeclaration,
  Identifier,
  Node,
  Program,
  VariableDeclaration,
} from 'estree'
import MagicString from 'magic-string'
import type { ESTree } from 'vite'
import { buildScopeTree } from './scope'
import { extractIdentifiers, validateNonAsyncFunction } from './utils'

export type ModuleExportMeta = {
  localName?: string
  declarationKind?: 'function' | 'class' | VariableDeclaration['kind']
  isFunction?: boolean
  defaultExportIdentifierName?: string
}

export type ModuleExportGenerateContext = {
  implementation: string
  binding: string
  exportName: string
  meta: ModuleExportMeta
}

export type TransformModuleExportOptions = {
  generate: (context: ModuleExportGenerateContext) => string
  filter?: (name: string, meta: ModuleExportMeta) => boolean
  rejectNonAsyncFunction?: boolean
  exportAll?: 'error' | 'preserve'
}

export function transformModuleExport(
  input: string,
  viteAst: ESTree.Program,
  options: TransformModuleExportOptions,
): {
  output: MagicString
  referenceNames: string[]
} {
  const ast = viteAst as unknown as Program
  const output = new MagicString(input)
  const referenceNames: string[] = []
  const emissions = new Map<number, string[]>()
  const filter = options.filter ?? (() => true)
  const usedNames = new Set(buildScopeTree(ast).moduleScope.declarations)
  const declarationCounts = getModuleDeclarationCounts(ast)

  function allocateName(base: string): string {
    let name = base
    for (let i = 2; usedNames.has(name); i++) {
      name = `${base}_${i}`
    }
    usedNames.add(name)
    return name
  }

  function extractDeclaration(
    identifier: Identifier,
    exportName: string,
    meta: ModuleExportMeta,
    position: number,
  ): void {
    const localName = identifier.name
    if (declarationCounts.get(localName) !== 1) {
      throw Object.assign(new Error('unsupported duplicate export binding'), {
        pos: identifier.start,
      })
    }
    const implementation = allocateName(`${localName}$$impl`)
    output.update(identifier.start, identifier.end, implementation)

    // The source name is available for the generated canonical binding after
    // its declaration is renamed to the private implementation.
    usedNames.delete(localName)
    const binding = allocateName(localName)
    generate({ implementation, binding, exportName, meta }, position)
  }

  function emit(position: number, code: string): void {
    const codes = emissions.get(position) ?? []
    codes.push(code)
    emissions.set(position, codes)
  }

  function generate(
    context: ModuleExportGenerateContext,
    position: number,
  ): void {
    referenceNames.push(context.exportName)
    emit(position, options.generate(context))
  }

  function preserveExport(
    localName: string,
    exportName: string,
    position: number,
  ): void {
    emit(
      position,
      localName === exportName
        ? `export { ${localName} };`
        : `export { ${localName} as ${exportName} };`,
    )
  }

  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (
          node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration'
        ) {
          tinyassert(node.declaration.id)
          const identifier = node.declaration.id
          const meta: ModuleExportMeta = {
            localName: identifier.name,
            declarationKind:
              node.declaration.type === 'FunctionDeclaration'
                ? 'function'
                : 'class',
            isFunction: getIsFunction(node.declaration),
          }
          if (!filter(identifier.name, meta)) continue

          validateNonAsyncFunction(options, node.declaration)
          output.remove(node.start, node.declaration.start)
          extractDeclaration(identifier, identifier.name, meta, node.end)
        } else if (node.declaration.type === 'VariableDeclaration') {
          const variableDeclaration = node.declaration
          const selected: Array<{
            identifier: Identifier
            meta: ModuleExportMeta
          }> = []
          const preserved: string[] = []

          for (const declaration of node.declaration.declarations) {
            const identifiers = extractIdentifiers(declaration.id)
            if (
              declaration.id.type !== 'Identifier' &&
              identifiers.some((identifier) =>
                filter(identifier.name, {
                  localName: identifier.name,
                  declarationKind: variableDeclaration.kind,
                }),
              )
            ) {
              throw Object.assign(
                new Error('unsupported destructured export declaration'),
                { pos: declaration.id.start },
              )
            }
            const isFunction =
              declaration.id.type === 'Identifier' && declaration.init
                ? getIsFunction(declaration.init)
                : undefined
            let validate = false
            for (const identifier of identifiers) {
              const meta: ModuleExportMeta = {
                localName: identifier.name,
                declarationKind: variableDeclaration.kind,
                isFunction,
              }
              if (filter(identifier.name, meta)) {
                selected.push({ identifier, meta })
                validate = true
              } else {
                preserved.push(identifier.name)
              }
            }
            if (validate && declaration.init) {
              validateNonAsyncFunction(options, declaration.init)
            }
          }

          if (selected.length === 0) continue
          output.remove(node.start, variableDeclaration.start)
          for (const { identifier, meta } of selected) {
            extractDeclaration(identifier, identifier.name, meta, node.end)
          }
          for (const name of preserved) preserveExport(name, name, node.end)
        } else {
          node.declaration satisfies never
        }
      } else if (node.specifiers.length > 0) {
        const selected = node.specifiers.map((specifier) => {
          tinyassert(specifier.local.type === 'Identifier')
          if (specifier.exported.type !== 'Identifier') {
            throw Object.assign(
              new Error('unsupported string literal export name'),
              { pos: specifier.exported.start },
            )
          }
          const meta: ModuleExportMeta = {}
          return {
            localName: specifier.local.name,
            exportName: specifier.exported.name,
            meta,
            selected: filter(specifier.exported.name, meta),
          }
        })
        if (!selected.some((item) => item.selected)) continue

        output.remove(node.start, node.end)
        const sourceTail = node.source
          ? input.slice(node.source.end, node.end).replace(/;?\s*$/, ';')
          : undefined
        for (const item of selected) {
          if (!item.selected) {
            if (node.source) {
              emit(
                node.end,
                `export { ${item.localName} as ${item.exportName} } from ${node.source.raw}${sourceTail}`,
              )
            } else {
              preserveExport(item.localName, item.exportName, node.end)
            }
            continue
          }

          let implementation = item.localName
          if (node.source) {
            implementation = allocateName(`$$import_${item.localName}`)
            emit(
              node.end,
              `import { ${item.localName} as ${implementation} } from ${node.source.raw}${sourceTail}`,
            )
          }
          const binding = allocateName(`$$module_${item.exportName}`)
          generate(
            {
              implementation,
              binding,
              exportName: item.exportName,
              meta: item.meta,
            },
            node.end,
          )
        }
      }
    } else if (node.type === 'ExportAllDeclaration') {
      if (options.exportAll !== 'preserve') {
        throw Object.assign(new Error('unsupported ExportAllDeclaration'), {
          pos: node.start,
        })
      }
    } else if (node.type === 'ExportDefaultDeclaration') {
      let implementation: string
      let bindingBase = '$$default'
      let meta: ModuleExportMeta

      if (
        (node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration') &&
        node.declaration.id
      ) {
        const identifier = node.declaration.id
        meta = {
          localName: identifier.name,
          declarationKind:
            node.declaration.type === 'FunctionDeclaration'
              ? 'function'
              : 'class',
          isFunction: getIsFunction(node.declaration),
        }
        if (!filter('default', meta)) continue

        validateNonAsyncFunction(options, node.declaration)
        output.remove(node.start, node.declaration.start)
        if (declarationCounts.get(identifier.name) !== 1) {
          throw Object.assign(
            new Error('unsupported duplicate export binding'),
            {
              pos: identifier.start,
            },
          )
        }
        implementation = allocateName(`${identifier.name}$$impl`)
        output.update(identifier.start, identifier.end, implementation)
        usedNames.delete(identifier.name)
        bindingBase = identifier.name
      } else {
        meta = {
          defaultExportIdentifierName:
            node.declaration.type === 'Identifier'
              ? node.declaration.name
              : undefined,
          isFunction: getIsFunction(node.declaration),
        }
        if (!filter('default', meta)) continue

        validateNonAsyncFunction(options, node.declaration)
        if (node.declaration.type === 'Identifier') {
          implementation = node.declaration.name
          output.remove(node.start, node.end)
        } else {
          implementation = allocateName('$$default$$impl')
          output.update(
            node.start,
            node.declaration.start,
            `const ${implementation} = `,
          )
        }
      }

      const binding = allocateName(bindingBase)
      generate(
        { implementation, binding, exportName: 'default', meta },
        node.end,
      )
    }
  }

  for (const [position, codes] of emissions) {
    output.appendLeft(position, `\n${codes.join('\n')}\n`)
  }

  return { output, referenceNames }
}

function getModuleDeclarationCounts(ast: Program): Map<string, number> {
  const counts = new Map<string, number>()
  const add = (name: string) => counts.set(name, (counts.get(name) ?? 0) + 1)

  for (const statement of ast.body) {
    if (statement.type === 'ImportDeclaration') {
      for (const specifier of statement.specifiers) add(specifier.local.name)
      continue
    }

    const declaration =
      statement.type === 'ExportNamedDeclaration' ||
      statement.type === 'ExportDefaultDeclaration'
        ? statement.declaration
        : statement
    if (!declaration) continue

    if (declaration.type === 'VariableDeclaration') {
      for (const declarator of declaration.declarations) {
        for (const identifier of extractIdentifiers(declarator.id)) {
          add(identifier.name)
        }
      }
    } else if (
      (declaration.type === 'FunctionDeclaration' ||
        declaration.type === 'ClassDeclaration') &&
      declaration.id
    ) {
      add(declaration.id.name)
    }
  }

  return counts
}

function getIsFunction(
  node: Node | ExportDefaultDeclaration['declaration'],
): boolean | undefined {
  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression'
  ) {
    return true
  }
  if (
    node.type === 'ClassDeclaration' ||
    node.type === 'Literal' ||
    node.type === 'ObjectExpression' ||
    node.type === 'ArrayExpression' ||
    node.type === 'ClassExpression'
  ) {
    return false
  }
}
