import { tinyassert } from '@hiogawa/utils'
import type {
  ExportAllDeclaration,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  ExportSpecifier,
  ArrowFunctionExpression,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  ClassDeclaration,
  Node,
  Program,
  VariableDeclaration,
  VariableDeclarator,
} from 'estree'
import { walk } from 'estree-walker'
import type { ESTree } from 'vite'
import { buildScopeTree } from './scope'
import { extractNames } from './utils'

export type FunctionParameters = {
  count: number
  hasRest: boolean
}

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
  /** Source parameter shape when the exported function is statically known. */
  parameters?: FunctionParameters
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
  const reassignedNames = getReassignedModuleBindings(ast)
  const localFunctionParameters = getLocalFunctionParameters(
    ast,
    reassignedNames,
  )

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
                exports: extractNames(declarator.id).map((name) => ({
                  localName: name,
                  exportName: name,
                  meta: {
                    declName: name,
                    isFunction,
                    valueNode: declarator.init ?? undefined,
                    ...(declarator.id.type !== 'Identifier' ||
                    reassignedNames.has(name)
                      ? {}
                      : getFunctionParametersMeta(declarator.init)),
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
                ...(reassignedNames.has(name)
                  ? {}
                  : getFunctionParametersMeta(node.declaration)),
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
              meta: groupParametersMeta(
                node.source
                  ? undefined
                  : localFunctionParameters.get(
                      specifier.local.type === 'Identifier'
                        ? specifier.local.name
                        : '',
                    ),
              ),
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
          ...(reassignedNames.has(node.declaration.id.name)
            ? {}
            : getFunctionParametersMeta(node.declaration)),
        }
      } else if (node.declaration.type === 'Identifier') {
        kind = 'identifier'
        meta = {
          defaultExportIdentifierName: node.declaration.name,
          valueNode: node.declaration,
          ...groupParametersMeta(
            localFunctionParameters.get(node.declaration.name),
          ),
        }
      } else {
        // export default function () {}
        // export default () => {}
        kind = 'other'
        meta = {
          isFunction: getIsFunction(node.declaration),
          valueNode: node.declaration,
          ...getFunctionParametersMeta(node.declaration),
        }
      }
      groups.push({ type: 'default', kind, node, localName, meta })
    }
  }

  return groups
}

function getLocalFunctionParameters(
  ast: Program,
  reassignedNames: Set<string>,
): Map<string, FunctionParameters> {
  const result = new Map<string, FunctionParameters>()

  for (const statement of ast.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration' ||
      statement.type === 'ExportDefaultDeclaration'
        ? statement.declaration
        : statement
    if (declaration?.type === 'FunctionDeclaration' && declaration.id) {
      if (!reassignedNames.has(declaration.id.name)) {
        result.set(declaration.id.name, getFunctionParameters(declaration)!)
      }
    } else if (declaration?.type === 'VariableDeclaration') {
      for (const declarator of declaration.declarations) {
        const parameters = getFunctionParameters(declarator.init)
        if (
          declarator.id.type === 'Identifier' &&
          parameters &&
          !reassignedNames.has(declarator.id.name)
        ) {
          result.set(declarator.id.name, parameters)
        }
      }
    }
  }

  return result
}

function getReassignedModuleBindings(ast: Program): Set<string> {
  const scopeTree = buildScopeTree(ast)
  const result = new Set<string>()
  const moduleVarNames = new Set<string>()
  const functionStack: (
    | FunctionDeclaration
    | FunctionExpression
    | ArrowFunctionExpression
  )[] = []

  function add(ids: Identifier[]) {
    for (const id of ids) {
      const declaredScope = scopeTree.referenceToDeclaredScope.get(id)
      if (declaredScope === scopeTree.moduleScope) {
        result.add(id.name)
        continue
      }

      // The shared scope tree currently resolves default parameter expressions
      // against body `var` declarations. Conservatively treat that ambiguous
      // binding as the same-named module binding unless a parameter shadows it.
      const parameterOwner = functionStack.findLast((fn) =>
        fn.params.some(
          (parameter) => parameter.start <= id.start && id.end <= parameter.end,
        ),
      )
      if (
        parameterOwner &&
        declaredScope === scopeTree.nodeScope.get(parameterOwner) &&
        scopeTree.moduleScope.declarations.has(id.name) &&
        !parameterOwner.params.some((parameter) =>
          extractNames(parameter).includes(id.name),
        )
      ) {
        result.add(id.name)
      }
    }
  }

  walk(ast, {
    enter(node) {
      if (
        (node.type === 'ForInStatement' || node.type === 'ForOfStatement') &&
        node.left.type === 'VariableDeclaration' &&
        node.left.kind === 'var' &&
        functionStack.length === 0
      ) {
        for (const declarator of node.left.declarations) {
          for (const name of extractNames(declarator.id)) {
            result.add(name)
          }
        }
      }
      if (
        node.type === 'VariableDeclaration' &&
        node.kind === 'var' &&
        functionStack.length === 0
      ) {
        for (const declarator of node.declarations) {
          for (const name of extractNames(declarator.id)) {
            if (moduleVarNames.has(name)) {
              result.add(name)
            }
            moduleVarNames.add(name)
          }
        }
      }
      if (node.type === 'AssignmentExpression') {
        add(getAssignedIdentifiers(node.left))
      } else if (
        node.type === 'UpdateExpression' &&
        node.argument.type === 'Identifier'
      ) {
        add([node.argument])
      } else if (
        (node.type === 'ForInStatement' || node.type === 'ForOfStatement') &&
        node.left.type !== 'VariableDeclaration'
      ) {
        add(getAssignedIdentifiers(node.left))
      }
      if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
      ) {
        functionStack.push(node)
      }
    },
    leave(node) {
      if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
      ) {
        functionStack.pop()
      }
    },
  })

  return result
}

function getAssignedIdentifiers(
  pattern: import('estree').Pattern,
): Identifier[] {
  if (pattern.type === 'Identifier') {
    return [pattern]
  }
  if (pattern.type === 'ObjectPattern') {
    return pattern.properties.flatMap((property) =>
      getAssignedIdentifiers(
        property.type === 'RestElement' ? property : property.value,
      ),
    )
  }
  if (pattern.type === 'ArrayPattern') {
    return pattern.elements.flatMap((element) =>
      element ? getAssignedIdentifiers(element) : [],
    )
  }
  if (pattern.type === 'RestElement') {
    return getAssignedIdentifiers(pattern.argument)
  }
  if (pattern.type === 'AssignmentPattern') {
    return getAssignedIdentifiers(pattern.left)
  }
  return []
}

function getFunctionParametersMeta(
  node: Node | ExportDefaultDeclaration['declaration'] | null | undefined,
): { parameters?: FunctionParameters } {
  return groupParametersMeta(getFunctionParameters(node))
}

function groupParametersMeta(parameters: FunctionParameters | undefined): {
  parameters?: FunctionParameters
} {
  return parameters ? { parameters } : {}
}

function getFunctionParameters(
  node: Node | ExportDefaultDeclaration['declaration'] | null | undefined,
): FunctionParameters | undefined {
  if (
    node?.type !== 'FunctionDeclaration' &&
    node?.type !== 'FunctionExpression' &&
    node?.type !== 'ArrowFunctionExpression'
  ) {
    return
  }
  return {
    count: node.params.length,
    hasRest: node.params.some((parameter) => parameter.type === 'RestElement'),
  }
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
