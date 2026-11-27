import type {
  ExportAllDeclaration,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  ExportSpecifier,
  FunctionDeclaration,
  ClassDeclaration,
  Node,
  Program,
  VariableDeclaration,
  VariableDeclarator,
  ArrowFunctionExpression,
  FunctionExpression,
  Pattern,
} from 'estree'
import { walk } from 'estree-walker'
import type { ESTree } from 'vite'
import { tinyassert } from '../utils/shared'
import { extractNames } from './utils'

export type ModuleExportMeta = {
  /**
   * The source node that evaluates to the exported value when directly
   * available.
   *
   * - The declaration for a function or class export.
   * - The initializer for a variable export.
   * - The declaration expression for a default export.
   * - `undefined` for export specifiers and re-exports.
   */
  valueNode?: Node | ExportDefaultDeclaration['declaration']
  /**
   * The source function referenced by a local export specifier or default
   * identifier. Only top-level function declarations and const function
   * initializers without assignments to the binding are resolved.
   * Writes to the same name in any scope conservatively leave it unresolved;
   * this does not perform binding or control-flow analysis.
   */
  resolvedValueNode?:
    | FunctionDeclaration
    | FunctionExpression
    | ArrowFunctionExpression
  // TODO: followings are used only for internal `transformRscCssExport`.
  // should probably simplify to use `valueNode` directly and remove these.
  /**
   * The local declaration name when statically available.
   *
   * - `"Page"` for `export function Page() {}`
   * - `"Page"` for `export const Page = () => {}`
   * - `undefined` for `export default () => {}`
   * - `undefined` for `export { Page }`
   */
  declName?: string
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
      export: ModuleExportEntry
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
      meta: ModuleExportMeta
    }

export function scanModuleExports(
  viteAst: ESTree.Program,
): ModuleExportGroup[] {
  const ast = viteAst as unknown as Program
  const groups: ModuleExportGroup[] = []
  const needsLocalResolution = ast.body.some(
    (node) =>
      (node.type === 'ExportNamedDeclaration' &&
        !node.source &&
        node.specifiers.length > 0) ||
      (node.type === 'ExportDefaultDeclaration' &&
        node.declaration.type === 'Identifier'),
  )
  const localFunctions = needsLocalResolution
    ? resolveLocalFunctions(ast)
    : new Map<string, SourceFunction>()

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
              const isFunction =
                declarator.id.type === 'Identifier' && declarator.init
                  ? getIsFunction(declarator.init)
                  : undefined
              return {
                node: declarator,
                // uniformly handle destructured exports such as
                //   export const { foo, bar } = ...
                // even though associated `meta` doesn't make sense anymore
                // TODO: Treat destructured bindings as unknown for both
                // "use server" and "use cache" instead of using the container
                // initializer as each binding's `valueNode`.
                // See the destructured-binding proxy export regression test.
                // https://github.com/vercel/next.js/blob/aae4179ac628e55483b62cd023a7e1827dcef122/crates/next-custom-transforms/src/transforms/server_actions.rs#L1787-L1815
                exports: extractNames(declarator.id).map((name) => ({
                  localName: name,
                  exportName: name,
                  meta: {
                    declName: name,
                    isFunction,
                    valueNode: declarator.init ?? undefined,
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
            export: {
              localName: name,
              exportName: name,
              meta: {
                declName: name,
                isFunction: getIsFunction(node.declaration),
                valueNode: node.declaration,
              },
            },
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
              meta:
                !node.source && specifier.local.type === 'Identifier'
                  ? resolvedMeta(localFunctions.get(specifier.local.name))
                  : {},
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
      if (
        (node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration') &&
        node.declaration.id
      ) {
        kind = 'named-declaration'
        localName = node.declaration.id.name
        meta = {
          declName: node.declaration.id.name,
          isFunction: getIsFunction(node.declaration),
          valueNode: node.declaration,
        }
      } else if (node.declaration.type === 'Identifier') {
        kind = 'identifier'
        meta = {
          defaultExportIdentifierName: node.declaration.name,
          valueNode: node.declaration,
          ...resolvedMeta(localFunctions.get(node.declaration.name)),
        }
      } else {
        // export default function () {}
        // export default () => {}
        kind = 'other'
        meta = {
          isFunction: getIsFunction(node.declaration),
          valueNode: node.declaration,
        }
      }
      groups.push({ type: 'default', kind, node, localName, meta })
    }
  }

  return groups
}

type SourceFunction = NonNullable<ModuleExportMeta['resolvedValueNode']>

function resolvedMeta(node: SourceFunction | undefined): ModuleExportMeta {
  return node ? { resolvedValueNode: node } : {}
}

function resolveLocalFunctions(ast: Program): Map<string, SourceFunction> {
  const functions = new Map<string, SourceFunction>()
  for (const statement of ast.body) {
    const node =
      statement.type === 'ExportNamedDeclaration' ||
      statement.type === 'ExportDefaultDeclaration'
        ? statement.declaration
        : statement
    if (node?.type === 'FunctionDeclaration' && node.id) {
      functions.set(node.id.name, node as FunctionDeclaration)
    } else if (node?.type === 'VariableDeclaration' && node.kind === 'const') {
      for (const { id, init } of node.declarations) {
        if (
          id.type === 'Identifier' &&
          (init?.type === 'FunctionExpression' ||
            init?.type === 'ArrowFunctionExpression')
        ) {
          functions.set(id.name, init)
        }
      }
    }
  }

  if (functions.size === 0) return functions

  // A function declaration is mutable, and even a const assignment can throw
  // before registration. Do not claim a source when its name is written to.
  // Deliberately conservative: shadowed writes also leave metadata unknown.
  walk(ast, {
    enter(node) {
      const target =
        node.type === 'AssignmentExpression'
          ? node.left
          : node.type === 'UpdateExpression'
            ? node.argument
            : node.type === 'ForInStatement' || node.type === 'ForOfStatement'
              ? node.left
              : undefined
      if (target && target.type !== 'MemberExpression') {
        const patterns =
          target.type === 'VariableDeclaration'
            ? target.declarations.map((declaration) => declaration.id)
            : [target]
        for (const pattern of patterns) {
          for (const name of extractNames(pattern as Pattern))
            functions.delete(name)
        }
      }
    },
  })
  return functions
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
