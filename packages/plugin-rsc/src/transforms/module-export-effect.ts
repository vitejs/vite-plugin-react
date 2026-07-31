import { tinyassert } from '@hiogawa/utils'
import type { ExportDefaultDeclaration, Node, Program } from 'estree'
import MagicString from 'magic-string'
import type { ESTree } from 'vite'
import type {
  TransformModuleExportFilter,
  TransformModuleExportMeta,
} from './module-export'
import { extractNames, validateNonAsyncFunction } from './utils'

export type TransformModuleExportEffectContext = {
  binding: string
  exportName: string
  meta: TransformModuleExportMeta
}

export type TransformModuleExportEffectOptions = {
  generate: (context: TransformModuleExportEffectContext) => string
  filter?: TransformModuleExportFilter
  rejectNonAsyncFunction?: boolean
  exportAll?: 'error' | 'preserve'
}

/**
 * Preserves selected source exports and appends one generated module effect for
 * each exported value. This models Next.js-style module Server Action lowering.
 */
export function transformModuleExportEffect(
  input: string,
  viteAst: ESTree.Program,
  options: TransformModuleExportEffectOptions,
): {
  output: MagicString
  references: TransformModuleExportEffectContext[]
  referenceNames: string[]
} {
  const ast = viteAst as unknown as Program
  const output = new MagicString(input)
  const filter = options.filter ?? (() => true)
  const references: TransformModuleExportEffectContext[] = []
  const effects: string[] = []

  function generate(context: TransformModuleExportEffectContext): void {
    references.push(context)
    effects.push(options.generate(context))
  }

  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (
          node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration'
        ) {
          tinyassert(node.declaration.id)
          const binding = node.declaration.id.name
          const meta: TransformModuleExportMeta = {
            localName: binding,
            declarationKind:
              node.declaration.type === 'FunctionDeclaration'
                ? 'function'
                : 'class',
            isFunction:
              node.declaration.type === 'FunctionDeclaration' ? true : false,
          }
          if (!filter(binding, meta)) continue
          validateNonAsyncFunction(options, node.declaration)
          generate({ binding, exportName: binding, meta })
        } else if (node.declaration.type === 'VariableDeclaration') {
          for (const declaration of node.declaration.declarations) {
            const names = extractNames(declaration.id)
            const isFunction =
              declaration.id.type === 'Identifier' && declaration.init
                ? getIsFunction(declaration.init)
                : undefined
            let validate = false
            for (const binding of names) {
              const meta: TransformModuleExportMeta = {
                localName: binding,
                declarationKind: node.declaration.kind,
                isFunction,
              }
              if (filter(binding, meta)) {
                validate = true
                generate({ binding, exportName: binding, meta })
              }
            }
            if (validate && declaration.init) {
              validateNonAsyncFunction(options, declaration.init)
            }
          }
        }
      } else {
        for (const specifier of node.specifiers) {
          tinyassert(specifier.local.type === 'Identifier')
          if (specifier.exported.type !== 'Identifier') {
            throw Object.assign(
              new Error('unsupported string literal export name'),
              { pos: specifier.exported.start },
            )
          }
          const exportName = specifier.exported.name
          const meta: TransformModuleExportMeta = {}
          if (!filter(exportName, meta)) continue

          let binding = specifier.local.name
          if (node.source) {
            binding = `$$effect_import_${exportName}`
            const sourceTail = input
              .slice(node.source.end, node.end)
              .replace(/;?\s*$/, ';')
            output.append(
              `\nimport { ${specifier.local.name} as ${binding} } from ${node.source.raw}${sourceTail}`,
            )
          }
          generate({ binding, exportName, meta })
        }
      }
    } else if (node.type === 'ExportAllDeclaration') {
      if (options.exportAll !== 'preserve') {
        throw Object.assign(new Error('unsupported ExportAllDeclaration'), {
          pos: node.start,
        })
      }
    } else if (node.type === 'ExportDefaultDeclaration') {
      let binding: string
      let meta: TransformModuleExportMeta
      if (
        (node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration') &&
        node.declaration.id
      ) {
        binding = node.declaration.id.name
        meta = {
          localName: binding,
          declarationKind:
            node.declaration.type === 'FunctionDeclaration'
              ? 'function'
              : 'class',
          isFunction:
            node.declaration.type === 'FunctionDeclaration' ? true : false,
        }
      } else if (node.declaration.type === 'Identifier') {
        binding = node.declaration.name
        meta = { defaultExportIdentifierName: binding }
      } else {
        binding = '$$effect_default'
        meta = { isFunction: getIsFunction(node.declaration) }
      }
      if (!filter('default', meta)) continue
      validateNonAsyncFunction(options, node.declaration)

      if (
        node.declaration.type !== 'Identifier' &&
        !(
          (node.declaration.type === 'FunctionDeclaration' ||
            node.declaration.type === 'ClassDeclaration') &&
          node.declaration.id
        )
      ) {
        output.update(node.start, node.declaration.start, `const ${binding} = `)
        output.appendLeft(node.end, `\nexport default ${binding};`)
      }
      generate({ binding, exportName: 'default', meta })
    }
  }

  if (effects.length > 0) output.append(`\n${effects.join('\n')}\n`)
  return {
    output,
    references,
    referenceNames: references.map((reference) => reference.exportName),
  }
}

function getIsFunction(
  node: Node | ExportDefaultDeclaration['declaration'],
): boolean | undefined {
  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
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
