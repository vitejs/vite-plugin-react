import type {} from 'estree'

// rollup ast has node position
declare module 'estree' {
  interface BaseNode {
    start: number
    end: number
  }
}
