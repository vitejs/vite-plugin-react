import { walk as walkEstree } from 'estree-walker'
import type { ESTree } from 'vite'

export type ArrowFunctionExpression = ESTree.ArrowFunctionExpression
export type ExportAllDeclaration = ESTree.ExportAllDeclaration
export type ExportDefaultDeclaration = ESTree.ExportDefaultDeclaration
export type FunctionDeclaration = ESTree.Function & {
  type: 'FunctionDeclaration'
  id: ESTree.BindingIdentifier
}
export type FunctionExpression = ESTree.Function & {
  type: 'FunctionExpression'
}
export type Identifier =
  | ESTree.BindingIdentifier
  | ESTree.IdentifierName
  | ESTree.IdentifierReference
  | ESTree.LabelIdentifier
export type Literal = Extract<ESTree.Node, { type: 'Literal' }>
export type MemberExpression = ESTree.MemberExpression
export type Node = ESTree.Node
export type Pattern =
  | ESTree.BindingPattern
  | ESTree.BindingRestElement
  | ESTree.FormalParameterRest
  | ESTree.MemberExpression
  | ESTree.TSParameterProperty
export type Program = ESTree.Program

type WalkerContext = {
  skip: () => void
  remove: () => void
  replace: (node: Node) => void
}

type WalkerHandler = (
  this: WalkerContext,
  node: Node,
  parent: Node | null,
  key: string | number | symbol | null | undefined,
  index: number | null | undefined,
) => void

// estree-walker supports these nodes at runtime but types them with @types/estree.
export const walk = walkEstree as unknown as (
  ast: Node,
  walker: { enter?: WalkerHandler; leave?: WalkerHandler },
) => Node | null
