/// <reference types="vite/client" />

declare module '*.mdx' {
  import { JSX } from 'react'
  export default () => JSX.Element
}
