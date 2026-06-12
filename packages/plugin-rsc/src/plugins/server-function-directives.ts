import { exactRegex } from '@rolldown/pluginutils'
import type { Literal, Program } from 'estree'
import { walk } from 'estree-walker'
import type { Plugin, ResolvedConfig, Rollup, ViteDevServer } from 'vite'
import { parseAstAsync } from 'vite'
import {
  hasDirective,
  transformDirectiveProxyExport,
  transformServerActionServer,
  type FunctionParameters,
  type TransformWrapExportFilter,
} from '../transforms'
import { hashString } from './utils'
import { normalizeViteImportAnalysisUrl } from './vite-utils'

type StringLiteral = Literal & { value: string }

export const SERVER_FUNCTION_DIRECTIVE_MARKER =
  '/* __vite_rsc_server_function_directives__ */'

export type ServerFunctionDirectiveContext = {
  /** Expression passed to `wrap`. */
  value: string
  /** Generated reference name for inline functions, or export name for modules. */
  name: string
  /** Vite module id containing the directive. */
  id: string
  /** Match result for the configured directive string or regular expression. */
  directiveMatch: RegExpMatchArray
  /** Whether the directive applies to a function body or an entire module. */
  location: 'inline' | 'module'
  /** Whether an inline function closes over values from an outer scope. */
  hasBoundArgs: boolean
  /** Declared parameter shape when statically known. */
  parameters?: FunctionParameters
  /** Imported runtime namespace when `runtime` is configured. */
  runtime?: string
  /** Export metadata. Only present for module-level directives. */
  meta?: Parameters<TransformWrapExportFilter>[1]
}

export type ServerFunctionDirective = {
  /** Exact directive string or regular expression matched against directives. */
  directive: string | RegExp
  /** Optional fast source prefilter, evaluated before parsing. */
  test?: (code: string) => boolean
  /** Optional module-id filter. */
  filter?: (id: string) => boolean
  /** Validates a matched directive before transforming it. */
  validate?: (context: {
    id: string
    directive: string
    location: 'inline' | 'module'
  }) => void
  /** Reject synchronous annotated functions when enabled. */
  rejectNonAsyncFunction?: boolean
  /** Overrides synchronous-function validation for module-level directives. */
  rejectNonAsyncModule?: boolean
  /** Module imported as a namespace for use by `wrap`. */
  runtime?: string
  /** Returns the runtime expression used to wrap the server function. */
  wrap: (context: ServerFunctionDirectiveContext) => string
  /** Selects which exports a module-level directive wraps and registers. */
  filterExport?: (context: {
    name: string
    id: string
    meta: Parameters<TransformWrapExportFilter>[1]
  }) => boolean
  /** Creates the error shown for inline directives outside RSC. */
  clientError?: (context: { id: string; environment: string }) => string
}

type Options = {
  definitions: ServerFunctionDirective[]
  manager: {
    config: Pick<ResolvedConfig, 'command'>
    server: Pick<ViteDevServer, 'environments'>
    toRelativeId: (id: string) => string
    serverReferenceMetaMap: Record<
      string,
      { importId: string; referenceKey: string; exportNames: string[] }
    >
  }
  serverEnvironmentName: string
  browserEnvironmentName: string
  encryptionRuntime: string
  rscRuntime: string
  browserRuntime: string
  ssrRuntime: string
  expandExportAll: (
    context: Rollup.TransformPluginContext,
    code: string,
    ast: Program,
    id: string,
  ) => Promise<{ code: string } | undefined>
}

function matchDirective(value: string, directive: string | RegExp) {
  const pattern =
    typeof directive === 'string'
      ? exactRegex(directive)
      : new RegExp(directive.source, directive.flags)
  pattern.lastIndex = 0
  return value.match(pattern) ?? undefined
}

function isStringLiteral(node: Literal): node is StringLiteral {
  return typeof node.value === 'string'
}

function findModuleDirective(
  ast: Program,
  directive: string | RegExp,
): StringLiteral | undefined {
  const statement = ast.body.find(
    (node) =>
      node.type === 'ExpressionStatement' &&
      node.expression.type === 'Literal' &&
      isStringLiteral(node.expression) &&
      matchDirective(node.expression.value, directive),
  )
  if (
    statement?.type === 'ExpressionStatement' &&
    statement.expression.type === 'Literal' &&
    isStringLiteral(statement.expression)
  ) {
    return statement.expression
  }
}

function findInlineDirective(
  ast: Program,
  directive: string | RegExp,
): StringLiteral | undefined {
  let result: StringLiteral | undefined
  walk(ast, {
    enter(node) {
      if (
        result ||
        (node.type !== 'FunctionDeclaration' &&
          node.type !== 'FunctionExpression' &&
          node.type !== 'ArrowFunctionExpression') ||
        node.body.type !== 'BlockStatement'
      ) {
        return
      }
      for (const statement of node.body.body) {
        if (
          statement.type === 'ExpressionStatement' &&
          statement.expression.type === 'Literal' &&
          isStringLiteral(statement.expression) &&
          matchDirective(statement.expression.value, directive)
        ) {
          result = statement.expression
          this.skip()
          return
        }
      }
    },
  })
  return result
}

export function vitePluginServerFunctionDirectives(options: Options): Plugin {
  const { definitions, manager } = options
  return {
    name: 'rsc:server-function-directives',
    transform: {
      async handler(code, id) {
        const active = definitions.filter(
          (definition) =>
            (definition.test?.(code) ?? code.includes('use ')) &&
            (!definition.filter || definition.filter(id)),
        )
        const isServer = this.environment.name === options.serverEnvironmentName
        if (active.length === 0) {
          if (isServer) delete manager.serverReferenceMetaMap[id]
          return
        }

        let ast = await parseAstAsync(code)
        const useServerBoundary = hasDirective(ast.body, 'use server')
        if (!isServer && useServerBoundary) return

        let normalizedId: string
        if (manager.config.command === 'build') {
          normalizedId = hashString(manager.toRelativeId(id))
        } else {
          const serverEnvironment =
            manager.server.environments[options.serverEnvironmentName]
          if (!serverEnvironment) {
            throw new Error(
              `Missing ${JSON.stringify(options.serverEnvironmentName)} environment`,
            )
          }
          normalizedId = normalizeViteImportAnalysisUrl(serverEnvironment, id)
        }

        if (!isServer) {
          for (const definition of active) {
            const inlineDirective = findInlineDirective(
              ast,
              definition.directive,
            )
            if (inlineDirective && definition.clientError) {
              throw Object.assign(
                new Error(
                  definition.clientError({
                    id,
                    environment: this.environment.name,
                  }),
                ),
                { pos: inlineDirective.start },
              )
            }
          }
          const matches = active.flatMap((definition) => {
            const moduleDirective = findModuleDirective(
              ast,
              definition.directive,
            )
            return moduleDirective
              ? [[definition, moduleDirective] as const]
              : []
          })
          if (matches.length === 0) return
          if (matches.length > 1) {
            const conflictingMatch = matches[1]
            throw Object.assign(
              new Error(
                'Multiple server function directives match this module.',
              ),
              { pos: conflictingMatch?.[1].start },
            )
          }
          const match = matches[0]
          if (!match) return
          const [, moduleDirective] = match

          const result = transformDirectiveProxyExport(ast, {
            code,
            directive: moduleDirective.value,
            runtime: (name) =>
              `$$ReactClient.createServerReference(${JSON.stringify(normalizedId + '#' + name)},$$ReactClient.callServer,undefined,${this.environment.mode === 'dev' ? '$$ReactClient.findSourceMapURL' : 'undefined'},${JSON.stringify(name)})`,
          })
          if (!result?.output.hasChanged()) return
          result.output.prepend(
            `import * as $$ReactClient from ${JSON.stringify(this.environment.name === options.browserEnvironmentName ? options.browserRuntime : options.ssrRuntime)};\n`,
          )
          return {
            code: result.output.toString(),
            map: result.output.generateMap({ hires: 'boundary', source: id }),
          }
        }

        const exportNames = new Set<string>()
        let needsReactRuntime = false
        let needsEncryptionRuntime = false
        let outputMap:
          | ReturnType<
              ReturnType<
                typeof transformServerActionServer
              >['output']['generateMap']
            >
          | undefined

        for (const definition of active) {
          const runtimeName = definition.runtime
            ? `$$server_function_directive_${hashString(definition.runtime)}`
            : undefined
          let runtimeUsed = false
          const getRuntime = () => {
            if (runtimeName) runtimeUsed = true
            return runtimeName
          }
          let moduleDirective = findModuleDirective(ast, definition.directive)
          if (moduleDirective) {
            if (useServerBoundary) {
              throw Object.assign(
                new Error(
                  `A module cannot contain both ${JSON.stringify(moduleDirective.value)} and "use server" directives.`,
                ),
                { pos: moduleDirective.start },
              )
            }
            const expanded = await options.expandExportAll(this, code, ast, id)
            if (expanded) {
              code = expanded.code
              ast = await parseAstAsync(code)
              moduleDirective = findModuleDirective(ast, definition.directive)
            }
          }

          const moduleMatch = moduleDirective
            ? matchDirective(moduleDirective.value, definition.directive)
            : undefined
          if (moduleMatch) {
            definition.validate?.({
              id,
              directive: moduleMatch[0],
              location: 'module',
            })
          }

          const result = transformServerActionServer(code, ast, {
            runtime: (value, name) =>
              `$$ReactServer.registerServerReference(${value}, ${JSON.stringify(normalizedId)}, ${JSON.stringify(name)})`,
            directive: definition.directive,
            moduleDirective,
            moduleRuntime: (value, name, meta) => {
              if (!moduleMatch) return value
              return `$$ReactServer.registerServerReference(${definition.wrap({ value, name, id, directiveMatch: moduleMatch, location: 'module', hasBoundArgs: false, parameters: meta.parameters, runtime: getRuntime(), meta })}, ${JSON.stringify(normalizedId)}, ${JSON.stringify(name)})`
            },
            inlineRuntime: (value, name, meta) => {
              definition.validate?.({
                id,
                directive: meta.directiveMatch[0],
                location: 'inline',
              })

              const wrapped = definition.wrap({
                value,
                name,
                id,
                directiveMatch: meta.directiveMatch,
                location: 'inline',
                hasBoundArgs: meta.hasBoundArgs,
                parameters: meta.parameters,
                runtime: getRuntime(),
              })

              if (useServerBoundary) return wrapped

              needsReactRuntime = true
              if (meta.hasBoundArgs) {
                needsEncryptionRuntime = true
                return `$$ReactServer.registerServerReference((($$wrapped) => async ($$encoded, ...$$args) => $$wrapped(...await __vite_rsc_encryption_runtime.decryptActionBoundArgs($$encoded), ...$$args))(${wrapped}), ${JSON.stringify(normalizedId)}, ${JSON.stringify(name)})`
              }
              return `$$ReactServer.registerServerReference(${wrapped}, ${JSON.stringify(normalizedId)}, ${JSON.stringify(name)})`
            },
            filter: (name, meta) =>
              definition.filterExport?.({ name, id, meta }) ?? true,
            rejectNonAsyncFunction: definition.rejectNonAsyncFunction,
            rejectNonAsyncModule: definition.rejectNonAsyncModule,
            encode: (value) => {
              needsEncryptionRuntime = true
              return `__vite_rsc_encryption_runtime.encryptActionBoundArgs(${value})`
            },
            stableName: true,
            detectUseServerModule: false,
            rejectForbiddenExpressions: true,
          })
          if (!result.output.hasChanged()) continue

          if (runtimeUsed && definition.runtime && runtimeName) {
            result.output.prepend(
              `import * as ${runtimeName} from ${JSON.stringify(definition.runtime)};\n`,
            )
          }

          const resultExportNames =
            'names' in result ? result.names : result.exportNames
          resultExportNames.forEach((name) => exportNames.add(name))
          outputMap = result.output.generateMap({
            hires: 'boundary',
            source: id,
          })
          code = result.output.toString()
          ast = await parseAstAsync(code)
        }

        if (!useServerBoundary) {
          if (exportNames.size === 0) delete manager.serverReferenceMetaMap[id]
          else {
            manager.serverReferenceMetaMap[id] = {
              importId: id,
              referenceKey: normalizedId,
              exportNames: [...exportNames],
            }
          }
        }
        const imports = [
          needsReactRuntime &&
            `import * as $$ReactServer from ${JSON.stringify(options.rscRuntime)};`,
          needsEncryptionRuntime &&
            `import * as __vite_rsc_encryption_runtime from ${JSON.stringify(options.encryptionRuntime)};`,
        ].filter(Boolean)
        return {
          code: `${SERVER_FUNCTION_DIRECTIVE_MARKER}\n${imports.join('\n')}\n${code}`,
          map: outputMap,
        }
      },
    },
  }
}
