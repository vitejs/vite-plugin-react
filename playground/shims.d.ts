declare module 'css-color-names' {
  const colors: Record<string, string>
  export default colors
}

declare module 'kill-port' {
  const kill: (port: number) => Promise<void>
  export default kill
}
