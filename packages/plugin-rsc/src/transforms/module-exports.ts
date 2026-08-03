import { tinyassert } from '@hiogawa/utils'
import type {
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  ExportSpecifier,
  FunctionDeclaration,
  ClassDeclaration,
  Node,
  Program,
  VariableDeclaration,
  VariableDeclarator,
} from 'estree'
import type { ESTree } from 'vite'
import { extractNames } from './utils'

export type ModuleExportMeta = {
  /**
   * The local declaration name when statically available.
   *
   * - `"Page"` for `export function Page() {}`
   * - `"Page"` for `export const Page = () => {}`
   * - `undefined` for `export default () => {}`
   * - `undefined` for `export { Page }`
   */
  localName?: string
  /** The source declaration kind when statically available. */
  declarationKind?: 'function' | 'class' | VariableDeclaration['kind']
  /**
   * Whether the exported value is statically known to be a function.
   *
   * - `true` for `export const Page = () => {}`
   * - `false` for `export const value = 1`
   * - `undefined` for `export const value = getValue()`
   * - `undefined` for `export default Page`
   */
  isFunction?: boolean
  /**
   * The local identifier referenced by a default export.
   *
   * - `"Page"` for `const Page = () => {}; export default Page`
   * - `undefined` for `export default function Page() {}`
   * - `undefined` for `export default () => {}`
   */
  defaultExportIdentifierName?: string
}

export type ModuleExportEntry = {
  localName: string
  exportName: string
  meta: ModuleExportMeta
}

export type ModuleExportSpecifier = {
  node: ExportSpecifier
  localName: string
  exportName: string
  meta: ModuleExportMeta
}

export type ModuleExportGroup =
  | {
      type: 'declaration'
      node: ExportNamedDeclaration
      declaration: FunctionDeclaration | ClassDeclaration
      exports: [ModuleExportEntry]
    }
  | {
      type: 'variable-declaration'
      node: ExportNamedDeclaration
      declaration: Extract<
        ExportNamedDeclaration['declaration'],
        { type: 'VariableDeclaration' }
      >
      declarators: {
        node: VariableDeclarator
        exports: ModuleExportEntry[]
      }[]
    }
  | {
      type: 'specifiers'
      node: ExportNamedDeclaration
      exports: ModuleExportSpecifier[]
    }
  | {
      type: 'export-all'
      node: Extract<Program['body'][number], { type: 'ExportAllDeclaration' }>
    }
  | {
      type: 'default'
      node: ExportDefaultDeclaration
      localName?: string
      meta: ModuleExportMeta
    }

export function scanModuleExports(
  viteAst: ESTree.Program,
): ModuleExportGroup[] {
  const ast = viteAst as unknown as Program
  const groups: ModuleExportGroup[] = []

  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (node.declaration.type === 'VariableDeclaration') {
          /**
           * export const foo = 1, bar = 2
           */
          const declaration = node.declaration
          groups.push({
            type: 'variable-declaration',
            node,
            declaration,
            declarators: declaration.declarations.map((declarator) => {
              const isFunction =
                declarator.id.type === 'Identifier' && declarator.init
                  ? getIsFunction(declarator.init)
                  : undefined
              return {
                node: declarator,
                exports: extractNames(declarator.id).map((name) => ({
                  localName: name,
                  exportName: name,
                  meta: {
                    localName: name,
                    declarationKind: declaration.kind,
                    isFunction,
                  },
                })),
              }
            }),
          })
        } else {
          /**
           * export function foo() {}
           * export class Foo {}
           */
          tinyassert(node.declaration.id)
          const name = node.declaration.id.name
          groups.push({
            type: 'declaration',
            node,
            declaration: node.declaration,
            exports: [
              {
                localName: name,
                exportName: name,
                meta: {
                  localName: name,
                  declarationKind:
                    node.declaration.type === 'FunctionDeclaration'
                      ? 'function'
                      : 'class',
                  isFunction: getIsFunction(node.declaration),
                },
              },
            ],
          })
        }
      } else {
        /**
         * export { foo, bar as baz }
         * export { foo, bar as baz } from './dep'
         */
        groups.push({
          type: 'specifiers',
          node,
          exports: node.specifiers.map((specifier) => {
            return {
              node: specifier,
              localName:
                specifier.local.type === 'Identifier'
                  ? specifier.local.name
                  : String(specifier.local.value),
              exportName:
                specifier.exported.type === 'Identifier'
                  ? specifier.exported.name
                  : String(specifier.exported.value),
              meta: {},
            }
          }),
        })
      }
    } else if (node.type === 'ExportAllDeclaration') {
      /**
       * export * as ns from './dep'
       * export * from './dep'
       */
      groups.push({ type: 'export-all', node })
    } else if (node.type === 'ExportDefaultDeclaration') {
      /**
       * export default function foo() {}
       * export default class Foo {}
       * export default () => {}
       */
      let localName: string | undefined
      let meta: ModuleExportMeta
      if (
        (node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration') &&
        node.declaration.id
      ) {
        localName = node.declaration.id.name
        meta = {
          localName: node.declaration.id.name,
          declarationKind:
            node.declaration.type === 'FunctionDeclaration'
              ? 'function'
              : 'class',
          isFunction: getIsFunction(node.declaration),
        }
      } else {
        meta =
          node.declaration.type === 'Identifier'
            ? { defaultExportIdentifierName: node.declaration.name }
            : { isFunction: getIsFunction(node.declaration) }
      }
      groups.push({ type: 'default', node, localName, meta })
    }
  }

  return groups
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
