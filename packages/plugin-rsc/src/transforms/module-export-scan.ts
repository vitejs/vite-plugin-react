import { tinyassert } from '@hiogawa/utils'
import type {
  ExportAllDeclaration,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  ExportSpecifier,
  ArrowFunctionExpression,
  FunctionDeclaration,
  FunctionExpression,
  ClassDeclaration,
  Node,
  Program,
  VariableDeclaration,
  VariableDeclarator,
  MaybeNamedFunctionDeclaration,
} from 'estree'
import type { ESTree } from 'vite'
import { extractNames } from './utils'

export type ModuleExportFunction =
  | MaybeNamedFunctionDeclaration
  | FunctionExpression
  | ArrowFunctionExpression

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

type ModuleExportDefaultKind = 'named-declaration' | 'identifier' | 'other'

export type ModuleExportGroup =
  | {
      /**
       * export function foo() {}
       * export class Foo {}
       */
      type: 'declaration'
      node: ExportNamedDeclaration
      declaration: FunctionDeclaration | ClassDeclaration
      /** The function node for `export function foo() {}`. */
      directFunction?: FunctionDeclaration
      exports: [ModuleExportEntry]
    }
  | {
      /**
       * export const foo = 1, bar = 2
       */
      type: 'variable-declaration'
      node: ExportNamedDeclaration
      declaration: VariableDeclaration
      declarators: {
        node: VariableDeclarator
        /** The function node for `export const foo = () => {}`. */
        directFunction?: ModuleExportFunction
        exports: ModuleExportEntry[]
      }[]
    }
  | {
      /**
       * export { foo as bar }
       * export { foo as bar } from './dep'
       */
      type: 'specifiers'
      node: ExportNamedDeclaration
      exports: ModuleExportSpecifier[]
    }
  | {
      /**
       * export * from './dep'
       * export * as ns from './dep'
       */
      type: 'export-all'
      node: ExportAllDeclaration
    }
  | {
      /**
       * `named-declaration`: export default function foo() {}
       * `identifier`: export default value
       * `other`: export default function () {}
       * `other`: export default () => {}
       */
      type: 'default'
      kind: ModuleExportDefaultKind
      node: ExportDefaultDeclaration
      localName?: string
      /** The function node for `export default function () {}`. */
      directFunction?: ModuleExportFunction
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
          // export const foo = 1, bar = 2
          const declaration = node.declaration
          groups.push({
            type: 'variable-declaration',
            node,
            declaration,
            declarators: declaration.declarations.map((declarator) => {
              const directFunction =
                declarator.id.type === 'Identifier' && declarator.init
                  ? getFunctionNode(declarator.init)
                  : undefined
              const isFunction =
                declarator.id.type === 'Identifier' && declarator.init
                  ? getIsFunction(declarator.init)
                  : undefined
              return {
                node: declarator,
                directFunction,
                exports: extractNames(declarator.id).map((name) => ({
                  localName: name,
                  exportName: name,
                  meta: {
                    localName: name,
                    isFunction,
                  },
                })),
              }
            }),
          })
        } else {
          // export function foo() {}
          // export class Foo {}
          tinyassert(node.declaration.id)
          const name = node.declaration.id.name
          groups.push({
            type: 'declaration',
            node,
            declaration: node.declaration,
            directFunction:
              node.declaration.type === 'FunctionDeclaration'
                ? node.declaration
                : undefined,
            exports: [
              {
                localName: name,
                exportName: name,
                meta: {
                  localName: name,
                  isFunction: getIsFunction(node.declaration),
                },
              },
            ],
          })
        }
      } else {
        // export { foo as bar }
        // export { foo as bar } from './dep'
        groups.push({
          type: 'specifiers',
          node,
          exports: node.specifiers.map((specifier) => {
            // String-literal export names are unsupported. Callers must check
            // the returned node's local and exported types before rewriting.
            return {
              node: specifier,
              localName:
                specifier.local.type === 'Identifier'
                  ? specifier.local.name
                  : '__unsupported_string_export__',
              exportName:
                specifier.exported.type === 'Identifier'
                  ? specifier.exported.name
                  : '__unsupported_string_export__',
              meta: {},
            }
          }),
        })
      }
    } else if (node.type === 'ExportAllDeclaration') {
      // export * from './dep'
      // export * as ns from './dep'
      groups.push({ type: 'export-all', node })
    } else if (node.type === 'ExportDefaultDeclaration') {
      // export default function foo() {}
      // export default value
      let kind: ModuleExportDefaultKind
      let localName: string | undefined
      let meta: ModuleExportMeta
      const directFunction = getFunctionNode(node.declaration)
      if (
        (node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration') &&
        node.declaration.id
      ) {
        kind = 'named-declaration'
        localName = node.declaration.id.name
        meta = {
          localName: node.declaration.id.name,
          isFunction: getIsFunction(node.declaration),
        }
      } else if (node.declaration.type === 'Identifier') {
        kind = 'identifier'
        meta = { defaultExportIdentifierName: node.declaration.name }
      } else {
        // export default function () {}
        // export default () => {}
        kind = 'other'
        meta = { isFunction: getIsFunction(node.declaration) }
      }
      groups.push({
        type: 'default',
        kind,
        node,
        localName,
        directFunction,
        meta,
      })
    }
  }

  return groups
}

function getIsFunction(
  node: Node | ExportDefaultDeclaration['declaration'],
): boolean | undefined {
  if (getFunctionNode(node)) return true
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

function getFunctionNode(
  node: Node | ExportDefaultDeclaration['declaration'],
): ModuleExportFunction | undefined {
  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression'
  ) {
    return node
  }
}
