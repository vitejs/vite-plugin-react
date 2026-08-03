import { tinyassert } from '@hiogawa/utils'
import type {
  ExportDefaultDeclaration,
  Node,
  Program,
  VariableDeclaration,
} from 'estree'
import MagicString from 'magic-string'
import type { ESTree } from 'vite'
import { extractNames, validateNonAsyncFunction } from './utils'

// TODO: Metadata, filtering, and returned reference contexts are currently
// ported only for transformWrapExport compatibility. Remove them if no
// module-export-effect consumer needs this API surface.
export type TransformModuleExportEffectMeta = {
  localName?: string
  declarationKind?: 'function' | 'class' | VariableDeclaration['kind']
  isFunction?: boolean
  defaultExportIdentifierName?: string
}

export type TransformModuleExportEffectFilter = (
  name: string,
  meta: TransformModuleExportEffectMeta,
) => boolean

export type TransformModuleExportEffectContext = {
  binding: string
  exportName: string
  meta: TransformModuleExportEffectMeta
}

export type TransformModuleExportEffectOptions = {
  generate: (context: TransformModuleExportEffectContext) => string
  filter?: TransformModuleExportEffectFilter
  rejectNonAsyncFunction?: boolean
  exportAll?: 'error' | 'preserve'
}

export type TransformModuleExportEffectResult = {
  output: MagicString
  references: TransformModuleExportEffectContext[]
  referenceNames: string[]
}

/**
 * Preserves source bindings and emits registration effects at module end.
 *
 * The start of each generated runtime expression remains mapped to its original
 * Server Function export site. React captures the `registerServerReference`
 * caller as the reference source location, so unmapped generated code can fall
 * back to an adjacent location. Re-exports map to their export statement.
 *
 * Generated bindings such as `$$effect_default` and `$$effect_import_*` are not
 * deconflicted from user bindings, consistent with the other transform helpers.
 */
export function transformModuleExportEffect(
  input: string,
  viteAst: ESTree.Program,
  options: TransformModuleExportEffectOptions,
): TransformModuleExportEffectResult {
  const ast = viteAst as unknown as Program
  const output = new MagicString(input)
  const filter = options.filter ?? (() => true)
  const references: TransformModuleExportEffectContext[] = []

  function generate(context: TransformModuleExportEffectContext): string {
    references.push(context)
    return `${options.generate(context)};`
  }

  // Rewrite and move an existing source range so the generated runtime
  // expression retains that range's original mapping at module end.
  function replaceAndMove(
    start: number,
    end: number,
    destination: number,
    code: string,
  ): void {
    output.update(start, end, `\n${code}\n`)
    if (end !== destination) {
      output.move(start, end, destination)
    }
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
          const meta: TransformModuleExportEffectMeta = {
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
          replaceAndMove(
            node.start,
            node.declaration.start,
            input.length,
            `${generate({ binding, exportName: binding, meta })}\nexport { ${binding} };`,
          )
        } else if (node.declaration.type === 'VariableDeclaration') {
          const exportNames: string[] = []
          const effects: string[] = []
          for (const declaration of node.declaration.declarations) {
            const names = extractNames(declaration.id)
            exportNames.push(...names)
            const isFunction =
              declaration.id.type === 'Identifier' && declaration.init
                ? getIsFunction(declaration.init)
                : undefined
            let validate = false
            for (const binding of names) {
              const meta: TransformModuleExportEffectMeta = {
                localName: binding,
                declarationKind: node.declaration.kind,
                isFunction,
              }
              if (filter(binding, meta)) {
                validate = true
                effects.push(generate({ binding, exportName: binding, meta }))
              }
            }
            if (validate && declaration.init) {
              validateNonAsyncFunction(options, declaration.init)
            }
          }
          if (effects.length > 0) {
            replaceAndMove(
              node.start,
              node.declaration.start,
              input.length,
              `${effects.join('\n')}\nexport { ${exportNames.join(', ')} };`,
            )
          }
        }
      } else {
        const effects: string[] = []
        for (const specifier of node.specifiers) {
          tinyassert(specifier.local.type === 'Identifier')
          if (specifier.exported.type !== 'Identifier') {
            throw Object.assign(
              new Error('unsupported string literal export name'),
              { pos: specifier.exported.start },
            )
          }
          const exportName = specifier.exported.name
          const meta: TransformModuleExportEffectMeta = {}
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
          effects.push(generate({ binding, exportName, meta }))
        }
        if (effects.length > 0) {
          const originalExport = input.slice(node.start, node.end)
          if (node.source) {
            replaceAndMove(
              node.start,
              node.end,
              input.length,
              `${originalExport}\n${effects.join('\n')}`,
            )
          } else {
            replaceAndMove(
              node.start,
              node.end,
              input.length,
              `${effects.join('\n')}\n${originalExport}`,
            )
          }
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
      let meta: TransformModuleExportEffectMeta
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
        binding = '$$effect_default'
        meta = { defaultExportIdentifierName: node.declaration.name }
      } else {
        binding = '$$effect_default'
        meta = { isFunction: getIsFunction(node.declaration) }
      }
      if (!filter('default', meta)) continue
      validateNonAsyncFunction(options, node.declaration)
      const effect = generate({ binding, exportName: 'default', meta })

      if (node.declaration.type === 'Identifier') {
        const exportTokenEnd = node.start + 'export'.length
        output.update(
          exportTokenEnd,
          node.end,
          `const ${binding} = ${node.declaration.name};`,
        )
        replaceAndMove(
          node.start,
          exportTokenEnd,
          input.length,
          `${effect}\nexport default ${binding};`,
        )
      } else if (
        (node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration') &&
        node.declaration.id
      ) {
        replaceAndMove(
          node.start,
          node.declaration.start,
          input.length,
          `${effect}\nexport default ${binding};`,
        )
      } else {
        const exportTokenEnd = node.start + 'export'.length
        output.update(
          exportTokenEnd,
          node.declaration.start,
          `const ${binding} = `,
        )
        replaceAndMove(
          node.start,
          exportTokenEnd,
          input.length,
          `${effect}\nexport default ${binding};`,
        )
      }
    }
  }

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
